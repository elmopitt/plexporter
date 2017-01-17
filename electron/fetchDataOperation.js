const ApplicationSettings = require('../specification/applicationSettings.js');
const ID3Container = require('tny-id3').ID3Container;
const fs = require('fs');
const http = require('http');

/**
 * A class representing an operation for copying the files for a set of tracks
 * to a target directory.
 */
 // TODO: Consider creating a more general Operation interface which this
 // implements.
class FetchDataOperation {
  /**
   * @param {!ApplicationSettings} applicationSettings
   * @param {string} urlPath
   * @param {!Map<string, !Buffer>} dataByUrl
   * @param {!TrackCopyOperation} nextOperation
   */
  constructor(applicationSettings, urlPath, dataByUrl, nextOperation) {
    /**
     * @const {!ApplicationSettings}
     */
    this.applicationSettings = applicationSettings;

    /**
     * @const {string}
     */
    this.urlPath = urlPath;

    /**
     * @const {!Map<string, !Array<!Buffer>>}
     */
    this.dataByUrl = dataByUrl;

    /**
     * @const {!TrackCopyOperation}
     */
    this.nextOperation = nextOperation;

    /**
     * @private {?http.ClientRequest}
     */
    this.clientRequest_ = null;
  }

  perform() {
    if (this.dataByUrl.has(this.urlPath)) {
      this.nextOperation.perform();
      return;
    }
    let cachedError = null;
    try {
      const httpUrl = this.applicationSettings.plexServerAddress +
          this.urlPath + '&X-Plex-Token=' + this.applicationSettings.plexToken;
      this.clientRequest_ = http.get(
          httpUrl,
          /**
           * @param {!http.ServerResponse} res
           */
          (res) => {
            // TODO: Handle the playload.
            const bufferList = [];
            res.on('data', (buffer) => {
              bufferList.push(buffer);
            });
            res.on('end', () => {
              const totalLength = bufferList.reduce((soFar, buffer) => {
                return soFar + buffer.length;
              }, 0);
              const totalBuffer = Buffer.allocUnsafeSlow(totalLength);
              let totalSoFar = 0;
              for (const buffer of bufferList) {
                buffer.copy(totalBuffer, totalSoFar);
                totalSoFar += buffer.length;
              }
              this.dataByUrl.set(this.urlPath, totalBuffer);
              this.nextOperation.perform();
            })
          });
    } catch (error) {
      // TODO: Determine if this should ever be fatal.
      console.error('Error fetching data:');
      console.error(error);
      this.nextOperation.perform();
    }
  }
}

module.exports = FetchDataOperation;
