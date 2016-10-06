const ApplicationSettings = require('../specification/applicationSettings.js');
const DispatchChannel = require('../event/dispatchChannel.js');
const ResponseChannel = require('../event/responseChannel.js');
const TrackCopyOperation = require('./trackCopyOperation.js');
const app = require('electron').app;
const dialog = require('electron').dialog;
const fs = require('fs');
const ipcMain = require('electron').ipcMain;

class MainEventListener {
  constructor() {
    /**
     * @const {string}
     */
    this.userDataPath = app.getPath('userData');

    /**
     * @const {string}
     */
    this.applicationSettingsPath =
        this.userDataPath + '/applicationSettings.json';

    ipcMain.on(DispatchChannel.SELECT_PLEXPORTER_FILE, (event) => {
      dialog.showOpenDialog(
          {
            properties: ['openDirectory']
          },
          (selection) => {
            event.sender.send(
                ResponseChannel.SELECT_PLEXPORTER_FILE, selection);
          });
    });

    ipcMain.on(DispatchChannel.LOAD_APPLICATION_SETTINGS, (event) => {
      if (!this.validateUserDataDirectory()) {
        event.sender.send(ResponseChannel.LOAD_APPLICATION_SETTINGS, null);
      }
      let settingsString = '';
      try {
        const applicationSettingsStats =
            fs.statSync(this.applicationSettingsPath);
        if (applicationSettingsStats.isDirectory()) {
          console.error('applicationSettingsPath is a directory.');
          event.sender.send(ResponseChannel.LOAD_APPLICATION_SETTINGS, null);
          return;
        }
        if (!applicationSettingsStats.isFile()) {
          // There's no settings file, so send an empty settings object.
          console.log('Application settings file isn\'t a file.');
          event.sender.send(
              ResponseChannel.LOAD_APPLICATION_SETTINGS,
              new ApplicationSettings());
          return;
        }
        fs.readFile(this.applicationSettingsPath, 'utf8', (err, data) => {
          let applicationSettings = null;
          if (err) {
            console.error('Error reading application settings: ' + err);
          } else {
            applicationSettings =
                data ? JSON.parse(data) : new ApplicationSettings();
          }
          event.sender.send(
              ResponseChannel.LOAD_APPLICATION_SETTINGS,
              applicationSettings);
        });
      } catch (error) {
        // This file probably doesn't exist, which is fine.
        console.log('Exception loading application settings: ' + error);
        event.sender.send(
            ResponseChannel.LOAD_APPLICATION_SETTINGS,
            new ApplicationSettings());
      }
    });

    ipcMain.on(
        DispatchChannel.SAVE_APPLICATION_SETTINGS,
        (event, applicationSettings) => {
          console.log('Saving application settings...')
          if (!this.validateUserDataDirectory()) {
            console.log('...failed to validate user data directory.');
            event.sender.send(ResponseChannel.SAVE_APPLICATION_SETTINGS, false);
          }
          fs.writeFile(
              // TODO: Figure out how to delete a file.
              this.applicationSettingsPath || '',
              JSON.stringify(applicationSettings),
              'utf8',
              (err) => {
                console.log('...writeFile finished.');
                if (err) {
                  console.error('Error saving application settings: ' + err);
                }
                event.sender.send(
                    ResponseChannel.SAVE_APPLICATION_SETTINGS, !err);
              });
        });

    ipcMain.on(
        DispatchChannel.SELECT_EXISTING_DIRECTORY,
        (event) => {
          console.log('SELECT_EXISTING_DIRECTORY invoked...')
          dialog.showOpenDialog(
              {
                properties: ['openDirectory']
              },
              (selection) => {
                console.log('...selection is:');
                console.log(selection);
                event.sender.send(
                    ResponseChannel.SELECT_EXISTING_DIRECTORY,
                    selection ? selection[0] : null);
              });
        });

    ipcMain.on(
        DispatchChannel.COPY_TRACKS,
        (event, playlistSpecification, selectedDirectory, localPaths) => {
          console.log('COPY_TRACKS invoked...')
          const targetDirectory =
              selectedDirectory + '/' + playlistSpecification.title;
          let nextOperation = null;
          for (let i = playlistSpecification.tracks.length - 1; i >= 0; i--) {
            const copyOperation = new TrackCopyOperation(
                playlistSpecification.tracks[i],
                targetDirectory,
                localPaths,
                i,
                () => {
                  event.sender.send(ResponseChannel.COPY_TRACKS, null);
                },
                (err) => {
                  event.sender.send(ResponseChannel.COPY_TRACKS, err);
                },
                (progressPercentage) => {
                  event.sender.send(
                      ResponseChannel.PROGRESS_UPDATE,
                      100 * i / playlistSpecification.tracks.length);
                },
                nextOperation);
            nextOperation = copyOperation;
          }
          nextOperation.perform();
        });

    ipcMain.on(
        DispatchChannel.COPY_ALBUMS,
        (event, albums, selectedDirectory, localPaths) => {
          console.log('COPY_ALBUMS invoked...');
          const trackCopyOperations = [];
          let nextOperation = null;
          albums = Array.from(albums).reverse();
          const totalTrackCount = albums.reduce((soFar, album) => {
            return soFar + album.tracks.length;
          }, 0);
          let percentageIndex = totalTrackCount - 1;
          for (const album of albums) {
            const targetDirectory = selectedDirectory + '/' + album.title;
            const tracks = Array.from(album.tracks).reverse();
            tracks.forEach((track, index) => {
              const copyOperation = new TrackCopyOperation(
                  track,
                  targetDirectory,
                  localPaths,
                  null,
                  () => {
                    event.sender.send(ResponseChannel.COPY_ALBUMS, null);
                  },
                  (err) => {
                    event.sender.send(ResponseChannel.COPY_ALBUMS, err);
                  },
                  (progressPercentage) => {
                    event.sender.send(
                        ResponseChannel.PROGRESS_UPDATE,
                        100 * percentageIndex / totalTrackCount);
                  },
                  nextOperation);
              trackCopyOperations.push(copyOperation);
              nextOperation = copyOperation;
              percentageIndex--;
            });
          }
          nextOperation.perform();
        });
  }

  /**
   * Copies the files for the given tracks to the given directory.
   * Throws an error if any file could not be copied.
   * @param {!Array<!TrackSpecification>} tracks
   * @param {string} targetDirectory
   * @param {?Array<string>} localPaths
   * @private
   */
  copyTracks_(tracks, targetDirectory, localPaths) {
    let sourceFile = null;
    let targetFile = null;
    let cachedError = null;
    const buffer = Buffer.alloc(4096);
    try {
      const trackFilePaths = tracks.map((track) => {
        return track.filePath;
      });
      const adjustedPaths = this.resolveLocalPaths_(trackFilePaths, localPaths);
      let targetDirectoryStats = null;
      try {
        targetDirectoryStats = fs.statSync(targetDirectory);
      } catch (error) {
        targetDirectoryStats = null;
      }
      if (!targetDirectoryStats) {
        fs.mkdirSync(targetDirectory);
      } else if (!targetDirectoryStats.isDirectory()) {
        throw Error('Target directory already exists, but is not a directory:' +
            targetDirectory);
      }
      tracks.forEach((track, index) => {
        const fileNameSegments = track.filePath.split('/');
        // TODO: Determine whether leading zeros should be included.
        // TODO: Strip the original track number, if present.
        const targetFileName = (index + 1) + ' ' +
            fileNameSegments[fileNameSegments.length - 1];
        sourceFile = fs.openSync(adjustedPaths.get(track.filePath), 'r');
        targetFile = fs.openSync(targetDirectory + '/' + targetFileName, 'w+');
       let bytesRead = 0;
        while (bytesRead = fs.readSync(sourceFile, buffer, 0, 4096, null)) {
          fs.writeSync(targetFile, buffer, 0, bytesRead);
        }
        fs.closeSync(sourceFile);
        sourceFile = null;
        fs.closeSync(targetFile);
        targetFile = null;
      });
    } catch (error) {
      console.error('Error copying track:');
      console.error(error);
      cachedError = error;
    }
    if (sourceFile) {
      fs.close(sourceFile, () => {});
      sourceFile = null;
    }
    if (targetFile) {
      fs.close(targetFile, () => {});
      targetFile = null;
    }
    throw error;
  }

  /**
   * @return {boolean}
   */
  validateUserDataDirectory() {
    const userDataStats = fs.statSync(this.userDataPath);
    let applicationSettings = null;
    if (userDataStats.isFile()) {
      return false;
    }

    if (!userDataStats.isDirectory()) {
      fs.mkdirSync(this.userDataPath);
    }
    return true;
  }

  /**
   * @param {!Array<string>}
   * @param {!Array<string>}
   * @return {!Map<string, string>}
   */
  resolveLocalPaths_(filePaths, localPaths) {
    const adjustedPaths = new Map();
    for (let filePath of filePaths) {
      let fileStats = null;
      let adjustedPath = filePath;
      try {
        fileStats = fs.statSync(adjustedPath);
      } catch (err) {
        // Local file didn't exist; ignore and try local paths.
        fileStats = null;
      }
      if (!fileStats) {
        const pathElements = filePath.split('/');
        let pathSegment = pathElements.pop();
        while (!fileStats && pathElements.length) {
          pathSegment = '/' + pathSegment;
          for (const localPath of localPaths) {
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
        adjustedPaths.set(filePath, adjustedPath);
      } else {
        throw Error('Unable to find a local path for: ' + filePath);
      }
    }
    return adjustedPaths;
  }
}

module.exports = MainEventListener;
