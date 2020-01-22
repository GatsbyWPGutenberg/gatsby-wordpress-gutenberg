<?php
/**
 * Plugin Name: Gatsby Wordpress Gutenberg
 * Plugin URI: https://github.com/pristas-peter/gatsby-wordpress-gutenberg
 * Description: Enhance your gatsby project with gutenberg
 * Version: 0.0.0
 * Author: Peter Pristas, Henrik Wirth
 * Text Domain: gatsby-wordpress-gutenberg
 *
 * @package gatsby-wordpress-gutenberg
 */

### BEGIN AUTO-GENERATED DEFINES

### END AUTO-GENERATED DEFINES

if (!defined('ABSPATH')) {
  die('Silence is golden.');
}

if (!defined('GATSBY_WORDPRESS_GUTENBERG_AUTOLOAD')) {
  define('GATSBY_WORDPRESS_GUTENBERG_AUTOLOAD', true);
}

if (defined('GATSBY_WORDPRESS_GUTENBERG_AUTOLOAD') && true === GATSBY_WORDPRESS_GUTENBERG_AUTOLOAD) {
  // Autoload Required Classes.
  require_once dirname(__FILE__) . '/vendor/autoload.php';
}

require_once dirname(__FILE__) . '/lib/init.php';
