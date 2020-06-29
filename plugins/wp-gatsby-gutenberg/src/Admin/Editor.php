<?php

namespace WPGatsbyGutenberg\Admin;

class Editor
{
	public static $script_name = 'wp-gatsby-gutenberg';

	public static function enqueue_script()
	{
		$asset_file = include WP_GATSBY_GUTENBERG_PLUGIN_DIR .
			'build/index.asset.php';

		wp_enqueue_script(
			Editor::$script_name,
			WP_GATSBY_GUTENBERG_PLUGIN_URL . 'build/index.js',
			$asset_file['dependencies'],
			$asset_file['version']
		);

		wp_localize_script(Editor::$script_name, 'wpGatsbyGutenberg', [
			'settings' => Settings::get_settings(),
		]);
	}

	function __construct()
	{
		add_action('enqueue_block_editor_assets', function () {
			self::enqueue_script();
		});
	}
}
