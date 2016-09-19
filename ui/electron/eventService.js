const DispatchChannel = require('../../event/dispatchChannel.js');
const ResponseChannel = require('../../event/responseChannel.js');
const ipcRenderer = require('electron').ipcRenderer;

/**
 * An angular service for dispatching events and propagating the results.
 */
class ElectronEventService {
  /**
   * @param {!angular.$q}
   */
  constructor($q) {
    /**
     * @private {!angular.$q}
     */
    this.q_ = $q;

    /**
     * @private {?function}
     */
    this.loadApplicationSettingsHandler_ = null;

    /**
     * @private {?function}
     */
    this.saveApplicationSettingsHandler_ = null;
  }

  /**
   * @return {!angular.Promise}
   */
  loadApplicationSettings() {
    if (this.loadApplicationSettingsHandler_) {
      throw Error('loadAplicationSettings already in progress.');
    }
    const deferred = this.q_.defer();
    this.loadApplicationSettingsHandler_ = (event, applicationSettings) => {
      this.loadApplicationSettingsHandler_ = null;
      if (applicationSettings) {
        deferred.resolve(applicationSettings);
      } else {
        deferred.reject();
      }
    };
    ipcRenderer.once(
        ResponseChannel.LOAD_APPLICATION_SETTINGS,
        this.loadApplicationSettingsHandler_);
    ipcRenderer.send(DispatchChannel.LOAD_APPLICATION_SETTINGS);
    return deferred.promise;
  }

    /**
     * @param {!ApplicationSettings}
     * @return {!angular.Promise}
     */
    saveApplicationSettings(applicationSettings) {
      if (this.saveApplicationSettingsHandler_) {
        throw Error('saveAplicationSettings already in progress.');
      }
      const deferred = this.q_.defer();
      this.saveApplicationSettingsHandler_ = (event, isSuccessful) => {
        this.saveApplicationSettingsHandler_ = null;
        if (isSuccessful) {
          deferred.resolve();
        } else {
          deferred.reject();
        }
      };
      ipcRenderer.once(
          ResponseChannel.SAVE_APPLICATION_SETTINGS,
          this.saveApplicationSettingsHandler_);
      ipcRenderer.send(
          DispatchChannel.SAVE_APPLICATION_SETTINGS,
          applicationSettings);
      return deferred.promise;
    }
};

module.exports = ElectronEventService;
module.exports.SERVICE_NAME = 'electronEventService';
