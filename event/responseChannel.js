/**
 * An enumeration of channels to be used when responding to
 * {@code ipcRenderer.send}.
 * @enum {string}
 */
const ResponseChannel = {
  /**
   * Provides the percentage completed for the current request.
   * Arguments: number
   */
  PROGRESS_UPDATE: 'PROGRESS_UPDATE',

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

  /**
   * Provides a user-selected existing folder/directory.
   * Arguments: string
   */
  SELECT_EXISTING_DIRECTORY: 'SELECT_EXISTING_DIRECTORY_RESPONSE',

  /**
   * Provides an error if a COPY_TRACKS operation failed, or null otherwise.
   * Arguments: ?Error
   */
  COPY_TRACKS: 'COPY_TRACKS',

  /**
   * Provides an error if a COPY_ALBUMS operation failed, or null otherwise.
   * Arguments: ?Error
   */
  COPY_ALBUMS: 'COPY_ALBUMS',
};

module.exports = ResponseChannel;
