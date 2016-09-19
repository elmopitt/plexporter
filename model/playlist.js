const PlaylistSpecification = require('../specification/playlistSpecification.js');
const TrackSpecification = require('../specification/trackSpecification.js');

/**
 * A model representing a Plex playlist.
 */
class Playlist {
  /**
   * @param {!PlaylistSpecification} specification
   */
  constructor(specification) {
    /**
     * @private {!PlaylistSpecification}
     */
    this.specification_ = specification;

    /**
     * @private {string}
     */
    this.thumbnailUrl_ = '';

    /**
     * @private {?Blob}
     */
    this.thumbnail_ = null;
  }

  /**
   * Returns the specification for this playlist.
   * @return {!PlaylistSpecification}
   */
  getSpecification() {
    return this.specification_;
  }

  /**
   * Returns the thumbnail blob for this playlist.
   * @return {?Blob}
   */
  getThumbnailUrl() {
    return this.thumbnailUrl_;
  }

  setThumbnail(imageData) {
    this.thumbnail_ = new Blob([imageData], {type: 'image/jpeg'});
    this.thumbnailUrl_ = URL.createObjectURL(this.thumbnail_);
  }

  /**
   * Sets the tracks contained within this playlist based on a list of item
   * elements.
   * @param {!Array<!Element>} itemElements
   */
  setItemElements(itemElements) {
    const trackElements = itemElements.filter((element) => {
      return element.localName == 'track';
    });
    const mediaElements = itemElements.filter((element) => {
      return element.localName == 'media';
    });
    if (trackElements.length != mediaElements.length) {
      console.error('Expected an equal number of track and media elements.');
      this.specification_.tracks = [];
      return;
    }
    this.specification_.tracks = trackElements.map((trackElement, index) => {
      return new TrackSpecification(null, trackElement, mediaElements[index]);
    });
  }
}

module.exports = Playlist;
