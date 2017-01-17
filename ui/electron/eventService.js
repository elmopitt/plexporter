const ApplicationSettings = require('../../specification/applicationSettings.js');
const DispatchChannel = require('../../event/dispatchChannel.js');
const ExportSettings = require('../../specification/exportSettings.js');
const ResponseChannel = require('../../event/responseChannel.js');
const ipcRenderer = require('electron').ipcRenderer;

/**
 * An angular service for dispatching events and propagating the results.
 */
class ElectronEventService {
  /**
   * @param {!angular.$q}
   * @param {!angular.Scope}
   */
  constructor($q, $rootScope) {
    /**
     * @private {!angular.$q}
     */
    this.q_ = $q;

    /**
     * @private {!Map<ResponseChannel, function}
     */
    this.handlerByResponseChannel_ = new Map();

    ipcRenderer.on(
        ResponseChannel.PROGRESS_UPDATE,
        (event, progressPercentage) => {
          // Broadcast progress events from the $rootScope.
          $rootScope.$applyAsync(() => {
            $rootScope.$broadcast(
                ResponseChannel.PROGRESS_UPDATE, progressPercentage);
          });
        });
  }

  /**
   * @return {!angular.Promise}
   */
  loadApplicationSettings() {
    const deferred = this.q_.defer();
    this.setResponseHandler_(
        ResponseChannel.LOAD_APPLICATION_SETTINGS,
        (event, applicationSettings) => {
          this.loadApplicationSettingsHandler_ = null;
          if (applicationSettings) {
            deferred.resolve(applicationSettings);
          } else {
            deferred.reject();
          }
        });
    ipcRenderer.send(DispatchChannel.LOAD_APPLICATION_SETTINGS);
    return deferred.promise;
  }

  /**
   * @param {!ApplicationSettings}
   * @return {!angular.Promise}
   */
  saveApplicationSettings(applicationSettings) {
    const deferred = this.q_.defer();
    this.setResponseHandler_(
        ResponseChannel.SAVE_APPLICATION_SETTINGS,
        (event, isSuccessful) => {
          this.saveApplicationSettingsHandler_ = null;
          if (isSuccessful) {
            deferred.resolve();
          } else {
            deferred.reject();
          }
        });
    ipcRenderer.send(
        DispatchChannel.SAVE_APPLICATION_SETTINGS,
        applicationSettings);
    return deferred.promise;
  }

  /**
   * Prompts the user to select an existing director, and returns a promise to
   * the result.
   * @return {!angular.Promise}
   */
  selectExistingDirectory() {
    const deferred = this.q_.defer();
    this.setResponseHandler_(
        ResponseChannel.SELECT_EXISTING_DIRECTORY,
        (event, selectedDirectory) => {
          if (selectedDirectory) {
            deferred.resolve(selectedDirectory);
          } else {
            deferred.reject();
          }
        });
    ipcRenderer.send(DispatchChannel.SELECT_EXISTING_DIRECTORY);
    return deferred.promise;
  }

  /**
   * @param {!ApplicationSettings} applicationSettings
   * @param {!ExportSettings} exportSettings
   * @param {!PlaylistSpecification} playlistSpecification
   * @param {string} targetDirectory
   * @param {!Array<string>} localPaths
   * @return {!angular.Promise}
   */
  copyTracks(applicationSettings, exportSettings, playlistSpecification,
      targetDirectory, localPaths) {
    const deferred = this.q_.defer();
    this.setResponseHandler_(
        ResponseChannel.COPY_TRACKS,
        (event, error) => {
          if (!error) {
            deferred.resolve();
          } else {
            deferred.reject(error);
          }
        });
    ipcRenderer.send(DispatchChannel.COPY_TRACKS,
        applicationSettings,
        exportSettings,
        playlistSpecification,
        targetDirectory,
        localPaths);
    return deferred.promise;
  }

  /**
   * @param {!ApplicationSettings} applicationSettings
   * @param {!ExportSettings} exportSettings
   * @param {!Array<!AlbumSpecification>} albums
   * @param {string} targetDirectory
   * @param {!Array<string>} localPaths
   * @return {!angular.Promise}
   */
  copyAlbums(applicationSettings, exportSettings, albums, targetDirectory,
      localPaths) {
    const deferred = this.q_.defer();
    this.setResponseHandler_(
        ResponseChannel.COPY_ALBUMS,
        (event, error) => {
          if (!error) {
            deferred.resolve();
          } else {
            deferred.reject(error);
          }
        });
    ipcRenderer.send(DispatchChannel.COPY_ALBUMS,
        applicationSettings,
        exportSettings,
        albums,
        targetDirectory,
        localPaths);
    return deferred.promise;
  }

  /**
   * Sets a one-time response handler for the given channel, or throws an error
   * if a response on that channel is already pending.
   * @param {!ResponseChannel} channel
   * @param {function} handler
   * @private
   */
  setResponseHandler_(channel, handler) {
    if (this.handlerByResponseChannel_.has(channel)) {
      throw Error('Response is already in pending: ' + channel);
    }
    this.handlerByResponseChannel_.set(channel, handler);
    ipcRenderer.once(channel, (...args) => {
      this.handlerByResponseChannel_.delete(channel);
      handler.apply(this, args);
    });
  }
}

module.exports = ElectronEventService;
module.exports.SERVICE_NAME = 'electronEventService';
