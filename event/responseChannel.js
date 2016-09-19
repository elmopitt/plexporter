/**
 * An enumeration of channels to be used when responding to
 * {@code ipcRenderer.send}.
 * @enum {string}
 */
const ResponseChannel = {
  /**
   * Provides application settings.
   * Arguments: ApplicationSettingsSpecification
   */
  LOAD_APPLICATION_SETTINGS: 'LOAD_APPLICATION_SETTINGS_RESPONSE',

  /**
   * Indicates application settings were saved.
   * Arguments: boolean
   */
  SAVE_APPLICATION_SETTINGS: 'SAVE_APPLICATION_SETTINGS_RESPONSE',

  /**
   * Provides a user-selected *.plexporter file from the file system.
   * Arguments:
   */
  SELECT_PLEXPORTER_FILE: 'SELECT_PLEXPORTER_FILE_RESPONSE',
};

module.exports = ResponseChannel;
