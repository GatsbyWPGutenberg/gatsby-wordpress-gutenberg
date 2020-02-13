<?php
/**
 * Plugin Name: WP Gatsby Gutenberg
 * Plugin URI: https://github.com/pristas-peter/gatsby-wordpress-gutenberg
 * Description: Enhance your gatsby project with gutenberg
 * Version: 0.0.0
 * Author: Peter Pristas, Henrik Wirth
 * Text Domain: wp-gatsby-gutenberg
 *
 * @package gatsby-wordpress-gutenberg
 */

### BEGIN AUTO-GENERATED DEFINES

### END AUTO-GENERATED DEFINES

if (!defined('ABSPATH')) {
  die('Silence is golden.');
}

if (!defined('WP_GATSBY_GUTENBERG_AUTOLOAD')) {
  define('WP_GATSBY_GUTENBERG_AUTOLOAD', true);
}

if (defined('WP_GATSBY_GUTENBERG_AUTOLOAD') && true === WP_GATSBY_GUTENBERG_AUTOLOAD) {
  // Autoload Required Classes.
  require_once dirname(__FILE__) . '/vendor/autoload.php';
}

require_once dirname(__FILE__) . '/lib/init.php';
