<?php

namespace WpGatsbyGutenberg;

if (!defined('WP_GATSBY_GUTENBERG_PREVIEW_URL')) {
  define('WP_GATSBY_GUTENBERG_PREVIEW_URL', null);
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

    public function setup()
    {
      new \WpGatsbyGutenberg\Model\GutenbergPreview();
      new \WpGatsbyGutenberg\Graphql\TypeRegistrator();

      add_action('enqueue_block_editor_assets', function () {
        $asset_file = include plugin_dir_path(__FILE__) . 'build/index.asset.php';

        wp_enqueue_script(
          'wp-gatsby-gutenberg',
          plugins_url('build/index.js', __FILE__),
          $asset_file['dependencies'],
          $asset_file['version']
        );

        wp_localize_script('wp-gatsby-gutenberg', 'wpGatsbyGutenberg', array(
          'previewUrl' => WP_GATSBY_GUTENBERG_PREVIEW_URL
        ));
      });
    }
  }
}

WpGatsbyGutenberg::instance()->setup();
