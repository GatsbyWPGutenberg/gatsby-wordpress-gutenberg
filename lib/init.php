<?php

namespace GatsbyWordpressGutenberg;

if (!defined('GATSBY_WORDPRESS_GUTENBERG_PREVIEW_URL')) {
  define('GATSBY_WORDPRESS_GUTENBERG_PREVIEW_URL', null);
}

if (!class_exists('GatsbyWordpressGutenberg')) {
  final class GatsbyWordpressGutenberg
  {
    private static $instance;
    public static function instance()
    {
      if (!isset(self::$instance)) {
        self::$instance = new GatsbyWordpressGutenberg();
      }

      return self::$instance;
    }

    public function setup()
    {
      new \GatsbyWordpressGutenberg\Graphql\TypeRegistrator();

      add_action('enqueue_block_editor_assets', function () {
        $asset_file = include plugin_dir_path(__FILE__) . 'build/index.asset.php';

        wp_enqueue_script(
          'gatsby-wordpress-gutenberg',
          plugins_url('build/index.js', __FILE__),
          $asset_file['dependencies'],
          $asset_file['version']
        );

        wp_localize_script(
          'gatsby-wordpress-gutenberg',
          'gatsbyWordpressGutenberg',
          array(
            'previewUrl' => GATSBY_WORDPRESS_GUTENBERG_PREVIEW_URL,
          )
        );
      });
    }
  }
}

GatsbyWordpressGutenberg::instance()->setup();
