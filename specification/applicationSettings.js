/**
 * Specification for application settings.
 */
class ApplicationSettingsSpecification {
  constructor() {
    /**
     * HTTP address of the Plex server (e.g. "http://192.168.2.2:32400").
     * @type {string}
     */
    this.plexServerAddress = '';

    /**
     * Token
     * @type {string}
     */
    this.plexToken = '';

    /**
     * @type {!Array<string>}
     */
    this.localMediaPaths = [];
  }
}

module.exports = ApplicationSettingsSpecification;
