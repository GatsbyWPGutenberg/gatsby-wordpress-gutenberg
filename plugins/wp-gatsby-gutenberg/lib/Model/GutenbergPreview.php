<?php

namespace WpGatsbyGutenberg\Model;

use WP_Query;
use WP_REST_Request;
use WPGraphQL\Types;

if (!defined('WP_GATSBY_GUTENBERG_GUTENBERG_PREVIEW_POST_TYPE_NAME')) {
  define('WP_GATSBY_GUTENBERG_GUTENBERG_PREVIEW_POST_TYPE_NAME', 'wgg_preview');
}

if (!defined('WP_GATSBY_GUTENBERG_GUTENBERG_PREVIEW_GRAPHQL_SINGLE_NAME')) {
  define('WP_GATSBY_GUTENBERG_GUTENBERG_PREVIEW_GRAPHQL_SINGLE_NAME', 'GatsbyGutenbergPreview');
}

if (!defined('WP_GATSBY_GUTENBERG_GUTENBERG_PREVIEW_GRAPHQL_PLURAL_NAME')) {
  define('WP_GATSBY_GUTENBERG_GUTENBERG_PREVIEW_GRAPHQL_PLURAL_NAME', 'GatsbyGutenbergPreviews');
}

class GutenbergPreview
{
  public static $post_type = WP_GATSBY_GUTENBERG_GUTENBERG_PREVIEW_POST_TYPE_NAME;

  public static function get_preview_id($post_id, $preview_post_id)
  {
    $query = new WP_Query([
      'meta_query' => [
        [
          'key' => 'postId',
          'value' => $post_id
        ],
        [
          'key' => 'previewPostId',
          'value' => $preview_post_id
        ]
      ],
      'post_type' => self::$post_type,
      'post_status' => 'publish',
      'fields' => 'ids'
    ]);

    $posts = $query->get_posts();

    if (!empty($posts)) {
      return $posts[0] ?? null;
    }

    return null;
  }

  public static function insert_preview($post_id, $preview_post_id, $options)
  {
    $insert_options = array_merge($options, [
      'post_title' => $post_id,
      'post_type' => self::$post_type,
      'post_status' => 'publish',
      'meta_input' => array_merge($options['meta_input'], [
        'postId' => $post_id,
        'previewPostId' => $preview_post_id
      ])
    ]);

    $id = self::get_preview_id($post_id, $preview_post_id);

    if ($id) {
      $insert_options['ID'] = $id;
    }

    return wp_insert_post($insert_options, true);
  }

  public function __construct()
  {
    apply_filters('wgg_gutenberg_post_types', function ($post_types) {
      return array_filter($post_types, function ($post_type) {
        $post_type !== self::$post_type;
      });
    });

    add_action('init', function () {
      register_post_type(self::$post_type, array(
        'public' => true,
        'show_in_rest' => true,
        'rest_base' => 'gatsby-gutenberg-previews',
        'show_in_graphql' => true,
        'graphql_single_name' => WP_GATSBY_GUTENBERG_GUTENBERG_PREVIEW_GRAPHQL_SINGLE_NAME,
        'graphql_plural_name' => WP_GATSBY_GUTENBERG_GUTENBERG_PREVIEW_GRAPHQL_PLURAL_NAME,
        'supports' => ['title', 'custom-fields', 'author']
      ));
    });

    add_action('rest_api_init', function () {
      register_rest_route('gatsby-gutenberg/v1', '/previews/batch', array(
        'methods' => 'POST',
        'callback' => function (WP_REST_Request $request) {
          $batch = $request->get_param('batch');

          foreach ($batch as $post_id => $data) {
            foreach ($data['blocksByCoreBlockId'] as $core_block_id => $blocks) {
              $result = self::insert_preview($core_block_id, $post_id, [
                'meta_input' => [
                  'blocks' => $blocks
                ]
              ]);

              if (is_wp_error($result)) {
                return $result;
              }
            }

            $result = self::insert_preview($post_id, $post_id, [
              'meta_input' => $data
            ]);

            if (is_wp_error($result)) {
              return $result;
            }
          }
        },
        'permission_callback' => function () {
          return current_user_can('edit_others_posts');
        }
      ));
    });

    add_action('graphql_register_types', function ($type_registry) {
      register_graphql_field(WP_GATSBY_GUTENBERG_GUTENBERG_PREVIEW_GRAPHQL_SINGLE_NAME, 'gutenbergIsPreview', [
        'type' => ['non_null' => 'Boolean'],
        'resolve' => function () {
          return true;
        }
      ]);

      register_graphql_field(WP_GATSBY_GUTENBERG_GUTENBERG_PREVIEW_GRAPHQL_SINGLE_NAME, 'gutenbergBlocksJSON', [
        'type' => 'String',
        'resolve' => function ($model) {
          $value = get_post_meta($model->ID, 'blocks', true);
          return empty($value) ? null : json_encode($value);
        }
      ]);

      register_graphql_field(WP_GATSBY_GUTENBERG_GUTENBERG_PREVIEW_GRAPHQL_SINGLE_NAME, 'gutenbergPostId', [
        'type' => ['non_null' => 'Int'],
        'resolve' => function ($model) {
          return get_post_meta($model->ID, 'postId', true);
        }
      ]);

      register_graphql_field(WP_GATSBY_GUTENBERG_GUTENBERG_PREVIEW_GRAPHQL_SINGLE_NAME, 'gutenbergPreviewPostId', [
        'type' => 'Int',
        'resolve' => function ($model) {
          return get_post_meta($model->ID, 'previewPostId', true);
        }
      ]);

      register_graphql_field(WP_GATSBY_GUTENBERG_GUTENBERG_PREVIEW_GRAPHQL_SINGLE_NAME, 'gutenbergSlug', [
        'type' => 'String',
        'resolve' => function ($model) {
          $value = get_post_meta($model->ID, 'slug', true);
          return empty($value) ? null : $value;
        }
      ]);

      register_graphql_field(WP_GATSBY_GUTENBERG_GUTENBERG_PREVIEW_GRAPHQL_SINGLE_NAME, 'gutenbergLink', [
        'type' => 'String',
        'resolve' => function ($model) {
          $value = get_post_meta($model->ID, 'link', true);
          return empty($value) ? null : $value;
        }
      ]);

      register_graphql_field(WP_GATSBY_GUTENBERG_GUTENBERG_PREVIEW_GRAPHQL_SINGLE_NAME, 'gutenbergModifiedTime', [
        'type' => 'String',
        'resolve' => function ($model) {
          return Types::prepare_date_response(get_post($model->ID)->post_modified_gmt);
        }
      ]);
    });
  }
}
