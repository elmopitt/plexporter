/**
 * An enumeration of channels to be used when calling {@code ipcRenderer.send}.
 * @enum {string}
 */
const DispatchChannel = {
  /**
   * Indicates that the UI is ready to receive application settings.
   * Arguments: None
   */
  LOAD_APPLICATION_SETTINGS: 'LOAD_APPLICATION_SETTINGS',

  /**
   * Indicates that the UI is ready to receive application settings.
   * Arguments: ApplicationSettingsSpecification
   */
  SAVE_APPLICATION_SETTINGS: 'SAVE_APPLICATION_SETTINGS',

  /**
   * Allows the user to select a *.plexporter file from the file system.
   * Arguments:
   */
  SELECT_PLEXPORTER_FILE: 'SELECT_PLEXPORTER_FILE',
};

module.exports = DispatchChannel;
