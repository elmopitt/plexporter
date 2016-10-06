const fs = require('fs');
const ipcMain = require('electron').ipcMain;

/**
 * A class representing an operation for copying the files for a set of tracks
 * to a target directory.
 */
 // TODO: Consider creating a more general Operation interface which this
 // implements.
class TrackCopyOperation {
  /**
   * @param {!TrackSpecification} track
   * @param {string} targetDirectory
   * @param {?Array<string>} localPaths
   * @param {?number} index
   * @param {function():void} successFn
   * @param {function(*):void} errorFn
   * @param {function():void} progressFn
   * @param {?TrackCopyOperation} nextOperation
   */
  constructor(track, targetDirectory, localPaths, index, successFn, errorFn,
      progressFn, nextOperation) {
    /**
     * @const {!TrackSpecification}
     */
    this.track = track;

    /**
     * @const {string}
     */
    this.targetDirectory = targetDirectory;

    /**
     * @const {?Array<string>}
     */
    this.localPaths = localPaths;

    /**
     * @const {number}
     */
    this.index = index;

    /**
     * @const {function(): void}
     */
    this.successFn = successFn;

    /**
     * @const {function(*): void}
     */
    this.errorFn = errorFn;

    /**
     * @const {function(): void}
     */
    this.progressFn = progressFn;

    /**
     * @const {?TrackCopyOperation}
     */
    this.nextOperation = nextOperation;

    /**
     * @private
     */
    this.sourceFile_ = null;

    /**
     * @private
     */
    this.targetFile_ = null;

    /**
     * @private {?Buffer}
     */
    this.buffer_ = null;
  }

  /**
   * Returns a locally-accessible path for this operation's track.
   * @return {string}
   */
  resolveLocalPath_() {
    let fileStats = null;
    let adjustedPath = this.track.filePath;
    try {
      fileStats = fs.statSync(adjustedPath);
    } catch (err) {
      // Local file didn't exist; ignore and try local paths.
      fileStats = null;
    }
    if (!fileStats) {
      const pathElements = this.track.filePath.split('/');
      let pathSegment = pathElements.pop();
      while (!fileStats && pathElements.length) {
        pathSegment = '/' + pathSegment;
        for (const localPath of this.localPaths) {
          try {
            adjustedPath = localPath + pathSegment;
            fileStats = fs.statSync(adjustedPath);
            if (fileStats) {
              break;
            }
          } catch(err) {
            // Adjusted path didn't exist; ignore and keep trying.
            fileStats = null;
          }
        }
        pathSegment = pathElements.pop() + pathSegment;
      }
    }
    if (fileStats && fileStats.isFile()) {
      return adjustedPath;
    } else {
      throw Error('Unable to find a local path for: ' + this.track.filePath);
    }
  }

  perform() {
    this.progressFn();
    let cachedError = null;
    this.buffer_ = Buffer.alloc(4096);
    try {
      const adjustedPath = this.resolveLocalPath_();
      let targetDirectoryStats = null;
      try {
        targetDirectoryStats = fs.statSync(this.targetDirectory);
      } catch (error) {
        targetDirectoryStats = null;
      }
      if (!targetDirectoryStats) {
        fs.mkdirSync(this.targetDirectory);
      } else if (!targetDirectoryStats.isDirectory()) {
        throw Error('Target directory already exists, but is not a directory:' +
            this.targetDirectory);
      }

      const fileNameSegments = this.track.filePath.split('/');
      // TODO: Determine whether leading zeros should be included.
      // TODO: Strip the original track number, if present.
      let targetFileName = fileNameSegments[fileNameSegments.length - 1];
      if (this.index != null) {
        targetFileName = (this.index + 1) + ' ' + targetFileName;
      }
      this.sourceFile_ = fs.openSync(adjustedPath, 'r');
      this.targetFile_ =
          fs.openSync(this.targetDirectory + '/' + targetFileName, 'w+');
      this.continueCopy_();
    } catch (error) {
      console.error('Error copying track:');
      console.error(error);
      this.errorFn(error);
    }
  }

  continueCopy_() {
    fs.read(this.sourceFile_, this.buffer_, 0, this.buffer_.length, null,
        (err, bytesRead, buffer) => {
          if (err) {
            console.error('Error reading source file:');
            console.error(err);
            this.closeFiles_();
            this.errorFn(err);
            return;
          }
          if (!bytesRead) {
            // This file is done.
            this.closeFiles_();
            if (this.nextOperation) {
              this.nextOperation.perform();
            } else {
              this.successFn();
            }
          } else {
            fs.write(this.targetFile_, this.buffer_, 0, bytesRead,
                (err, bytesWritten, buffer) => {
                  if (err) {
                    console.error('Error writing target file:');
                    console.error(err);
                    this.closeFiles_();
                    this.errorFn(err);
                    return;
                  }
                  this.continueCopy_();
                });
          }
        });
  }

  closeFiles_() {
    if (this.sourceFile_) {
      fs.close(this.sourceFile_, (err) => {
        if (err) {
          console.error('Error closing file:');
          console.error(err);
        }
      });
      this.sourceFile_ = null;
    }
    if (this.targetFile_) {
      fs.close(this.targetFile_, (err) => {
        if (err) {
          console.error('Error closing file:');
          console.error(err);
        }
      });
      this.targetFile_ = null;
    }
  }
}

module.exports = TrackCopyOperation;
