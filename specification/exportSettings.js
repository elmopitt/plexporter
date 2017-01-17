/**
 * Specification for export settings.
 */
class ExportSettingsSpecification {
  constructor() {
    /**
     * Whether file should be copied to the target directory.
     * @type {boolean}
     */
    this.copyFiles = true;

    /**
     * Whether an M3U file should be created for the playlist.
     * @type {boolean}
     */
    this.createM3u = false;

    /**
     * Whether each track's entire album should be included.
     * @type {boolean}
     */
    this.includeAlbum = false;

    /**
     * Whether each track's album artwork should be re-written.
     * @type {boolean}
     */
    this.rewriteAlbumArtwork = false;
  }
}

module.exports = ExportSettingsSpecification;
