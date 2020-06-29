<?php

namespace WPGatsbyGutenberg\Admin;

class Settings
{
	static function get_settings()
	{
		return get_option('wp_gatsby_gutenberg_settings', []);
	}

	static function get_setting($key)
	{
		$options = self::get_settings();
		return $options[$key] ?? null;
	}

	function __construct()
	{
		add_action('admin_menu', function () {
			add_options_page(
				'GatsbyJS Gutenberg',
				'GatsbyJS Gutenberg',
				'manage_options',
				'wp-gatsby-gutenberg',
				function () {
					?>
    <form action='options.php' method='post'>
        <h2><?php echo __('Settings', 'wp-gatsby-gutenberg'); ?>
        </h2>

        <?php
        settings_fields('wp_gatsby_gutenberg');
        do_settings_sections('wp_gatsby_gutenberg');
        submit_button();?>

    </form>
    <?php
				}
			);
		});

		add_action('admin_init', function () {
			register_setting(
				'wp_gatsby_gutenberg',
				'wp_gatsby_gutenberg_settings',
				[
					'type' => 'array',
					'sanitize_callback' => function ($input) {
						$value = $input ?? [];

						$value['enable_live_preview'] =
							!empty($value['enable_live_preview']) &&
							$value['enable_live_preview'] === '1';
						return $value;
					},
				]
			);

			add_settings_section('default', '', '', 'wp_gatsby_gutenberg');

			add_settings_field(
				'enable_live_preview',
				__(
					'Enable Gatsby Preview in Gutenberg?',
					'wp-ga
                utenberg'
				),
				function () {
					echo '<input name="wp_gatsby_gutenberg_settings[enable_live_preview]" type="checkbox" value="1" class="code" ' .
						checked(
							1,
							self::get_setting('enable_live_preview'),
							false
						) .
						' />' .
						__('Yes', 'wordpress');
				},
				'wp_gatsby_gutenberg'
			);
		});
	}
}
