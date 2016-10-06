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
              const percentage = 100 * percentageIndex / totalTrackCount;
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
                        percentage);
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
}

module.exports = MainEventListener;
