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
   * Arguments: TBD, but none required.
   */
  SELECT_PLEXPORTER_FILE: 'SELECT_PLEXPORTER_FILE',

  /**
   * Allows the user to select an existing folder/directory.
   * Arguments: TBD, but none required.
   */
  SELECT_EXISTING_DIRECTORY: 'SELECT_EXISTING_DIRECTORY',

  /**
   * Copies the files specified by the given playlist to the given directory.
   * A list of local media paths may also be specified; if a file path cannot be
   * accessed directly, then an attempt will be made to locate the file in one
   * the local media paths.
   * Arguments: !ApplicationSettings, !ExportSettings, !PlaylistSpecification,
                string, ?Array<string>
   */
  COPY_TRACKS: 'COPY_TRACKS',

  /**
   * Copies all tracks from the given albums to the given directory.
   * A list of local media paths may also be specified; if a file path cannot be
   * accessed directly, then an attempt will be made to locate the file in one
   * the local media paths.
   * Arguments: !ApplicationSettings, !ExportSettings,
                !Array<!AlbumSpecification>, string, ?Array<string>
   */
  COPY_ALBUMS: 'COPY_ALBUMS',
};

module.exports = DispatchChannel;
