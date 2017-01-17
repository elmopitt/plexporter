const ID3Container = require('tny-id3').ID3Container;
const ID3FrameId = require('tny-id3').ID3FrameId;
const ID3PictureType = require('tny-id3').ID3PictureType;
const fs = require('fs');

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
   * @param {?string} prefix
   * @param {function():void} successFn
   * @param {function(*):void} errorFn
   * @param {function():void} progressFn
   * @param {?TrackCopyOperation} nextOperation
   * @param {string=} thumbnailPath
   * @param {?Map<string, !Buffer>} thumbnailByPath
   */
  constructor(track, targetDirectory, localPaths, prefix, successFn, errorFn,
      progressFn, nextOperation, thumbnailPath = null, thumbnailByPath = null) {
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
     * @const {?number}
     */
    this.prefix = prefix;

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
     * @private {?string}
     */
    this.thumbnailPath_ = thumbnailPath;

    /**
     * @private {?Map<string, !Buffer>}
     */
    this.thumbnailByPath_ = thumbnailByPath;

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
      // TODO: Strip the original track number, if present.
      let targetFileName = fileNameSegments[fileNameSegments.length - 1];
      if (this.prefix != null) {
        targetFileName = this.prefix + targetFileName;
      }
      const targetPath = this.targetDirectory + '/' + targetFileName;

      const thumbnailBuffer = (this.thumbnailPath_ && this.thumbnailByPath_ &&
          this.thumbnailByPath_.get(this.thumbnailPath_)) || null;
      if (thumbnailBuffer) {
        // If we have new tags to write, then rely on ID3Container.write to copy
        // the file.
        const id3Container = new ID3Container(adjustedPath);
        id3Container.onDone((err) => {
          if (err) {
            console.error('Error loading ID3 tags for ' +
                targetPath + ': ' + err);
            this.thumbnailPath_ = null;
            this.perform();
            return;
          }
          const artworkFrame = id3Container.getFrame(
              ID3FrameId.ATTACHED_PICTURE, true);
          artworkFrame.setPicture(
            ID3PictureType.OTHER,
            thumbnailBuffer,
            'image/jpeg');

          id3Container.write(
            (err) => {
              if (err) {
                // Try again with the ID3 tags.
                console.error('Error writing ID3 tags for ' +
                    targetPath + ': ' + err);
                this.thumbnailPath_ = null;
                this.perform();
                return;
              }
              if (this.nextOperation) {
                this.nextOperation.perform();
              } else {
                this.successFn();
              }
            },
            targetPath);
        });
      } else {
        // If we're not writing ID3 tags, then just pipe the original file to
        // the target path.

        // TODO(jpittenger): Opening streams and using pipe seems to be causing
        // errors.
        const readStream = fs.createReadStream(adjustedPath);
        const writeStream = fs.createWriteStream(targetPath, { flags: 'w+' });
        readStream.pipe(writeStream);

        readStream.on('error', (err) => {
          console.log('Error reading on track copy operation: ' + err);
          this.errorFn(err);
          readStream.close();
          writeStream.close();
        });
        writeStream.on('error', (err) => {
          console.log('Error writing on track copy operation: ' + err);
          this.errorFn(err);
          readStream.close();
          writeStream.close();
        });
        writeStream.on('finish', () => {
          if (this.nextOperation) {
            this.nextOperation.perform();
          } else {
            this.successFn();
          }
        });

        // this.buffer_ = Buffer.alloc(1024 * 1024 * 4);
        // this.sourceFile_ = fs.openSync(adjustedPath, 'r');
        // if (!this.sourceFile_) {
        //   throw Error('Unable to open source file: ' + adjustedPath);
        // }
        // this.targetFile_ = fs.openSync(targetPath, 'w+');
        // if (!this.targetFile_) {
        //   throw Error('Unable to open target file: ' + targetPath);
        // }
        // this.continueCopy_();
      }
    } catch (error) {
      console.error('Error copying track ' + this.track.filePath + ':');
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
                    console.error('Error writing target file ' +
                        this.track.filePath + ':');
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
