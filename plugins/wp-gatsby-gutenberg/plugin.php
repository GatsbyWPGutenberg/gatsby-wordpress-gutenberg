<?php

/**
 * Plugin Name: WP Gatsby Gutenberg
 * Plugin URI: https://github.com/pristas-peter/gatsby-wordpress-gutenberg
 * Description: Enhance your gatsby project with gutenberg
 * Version: 0.2.0
 * Author: Peter Pristas
 * Text Domain: wp-gatsby-gutenberg
 *
 * @package gatsby-wordpress-gutenberg
 */

use WPGatsbyGutenberg\Admin\Editor;
use WPGatsbyGutenberg\Preview\Preview;
use WPGatsbyGutenberg\Admin\Settings;

### BEGIN AUTO-GENERATED DEFINES

### END AUTO-GENERATED DEFINES

if (!defined('ABSPATH')) {
	die('Silence is golden.');
}

if (!defined('WP_GATSBY_GUTENBERG_AUTOLOAD')) {
	define('WP_GATSBY_GUTENBERG_AUTOLOAD', true);
}

if (
	defined('WP_GATSBY_GUTENBERG_AUTOLOAD') &&
	true === WP_GATSBY_GUTENBERG_AUTOLOAD
) {
	// Autoload Required Classes.
	require_once dirname(__FILE__) . '/vendor/autoload.php';
}

// Plugin Folder Path.
if (!defined('WP_GATSBY_GUTENBERG_PLUGIN_DIR')) {
	define('WP_GATSBY_GUTENBERG_PLUGIN_DIR', plugin_dir_path(__FILE__));
}

// Plugin Folder URL.
if (!defined('WP_GATSBY_GUTENBERG_PLUGIN_URL')) {
	define('WP_GATSBY_GUTENBERG_PLUGIN_URL', plugin_dir_url(__FILE__));
}

if (!class_exists('WpGatsbyGutenberg')) {
	final class WpGatsbyGutenberg
	{
		private static $instance;
		public static function instance()
		{
			if (!isset(self::$instance)) {
				self::$instance = new WpGatsbyGutenberg();
			}

			return self::$instance;
		}

		public function __construct()
		{
			new Settings();
			new Editor();
			new Preview();
		}
	}
}

add_action(
	'plugins_loaded',
	function () {
		if (function_exists('gatsby_init')) {
			WpGatsbyGutenberg::instance();
		}
	},
	100
);
