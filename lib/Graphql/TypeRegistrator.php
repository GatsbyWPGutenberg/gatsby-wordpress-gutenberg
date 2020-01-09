<?php

namespace GatsbyWordpressGutenberg\Graphql;

if (!defined('GATSBY_WORDPRESS_GUTENBERG_GRAPHQL_POST_TYPE_INTERFACE_NAME')) {
  define('GATSBY_WORDPRESS_GUTENBERG_GRAPHQL_POST_TYPE_INTERFACE_NAME', 'GutenbergPost');
}

if (!defined('GATSBY_WORDPRESS_GUTENBERG_GRAPHQL_GUTENBERG_POSTS_FIELD_NAME')) {
  define('GATSBY_WORDPRESS_GUTENBERG_GRAPHQL_GUTENBERG_POSTS_FIELD_NAME', 'gutenbergPosts');
}

if (!defined('GATSBY_WORDPRESS_GUTENBERG_GRAPHQL_GUTENBERG_POST_CONNECTION_NAME')) {
  define('GATSBY_WORDPRESS_GUTENBERG_GRAPHQL_GUTENBERG_POST_CONNECTION_NAME', 'GutenbergPostConnection');
}

// to be able to use use_block_editor_for_post_type()
require_once ABSPATH . 'wp-admin/includes/admin.php';

/**
 * Helper class to register our graphql types
 */
class TypeRegistrator
{
  private $type_registry;

  protected function resolve_graphql_type($model)
  {
    $type_name = apply_filters(
      'gwg_post_graphql_type',
      get_post_type_object($model->post_type)->graphql_single_name,
      $model->post_type,
      $model
    );

    return $this->type_registry->get_type($type_name);
  }

  protected function get_gutenberg_post_types()
  {
    return array_filter(get_post_types_by_support('editor'), function ($post_type) {
      return use_block_editor_for_post_type($post_type);
    });
  }

  public function get_gutenberg_graphql_types()
  {
    return apply_filters(
      'gwg_gutenberg_graphql_types',
      array_map(
        function ($post_type) {
          return get_post_type_object($post_type)->graphql_single_name;
        },
        array_filter(\WPGraphQL::get_allowed_post_types(), function ($post_type) {
          return in_array($post_type, $this->get_gutenberg_post_types());
        })
      )
    );
  }

  public function get_post_resolver($post_id)
  {
    return apply_filters('gwg_post_resolver', [\WPGraphQL\Data\DataSource::class, 'resolve_post_object'], $post_id);
  }

  public function __construct()
  {

    add_filter('graphql_wp_object_type_config', function ($config) {
      if (in_array(strtolower($config['name']), array_map('strtolower', $this->get_gutenberg_graphql_types()))) {
        $interfaces = $config['interfaces'];

        $config['interfaces'] = function () use ($interfaces) {
          return array_merge($interfaces(), [
            $this->type_registry->get_type(GATSBY_WORDPRESS_GUTENBERG_GRAPHQL_POST_TYPE_INTERFACE_NAME)
          ]);
        };
      }
      return $config;
    });

    add_action(
      'graphql_register_types',
      function ($type_registry) {
        $this->type_registry = $type_registry;

        register_graphql_interface_type(GATSBY_WORDPRESS_GUTENBERG_GRAPHQL_POST_TYPE_INTERFACE_NAME, [
          'resolveType' => function ($model) {
            return $this->resolve_graphql_type($model);
          },
          'fields' => [
            'id' => [
              'type' => ['non_null' => 'ID']
            ]
          ]
        ]);

        register_graphql_connection([
          'fromType' => 'RootQuery',
          'toType' => GATSBY_WORDPRESS_GUTENBERG_GRAPHQL_POST_TYPE_INTERFACE_NAME,
          'fromFieldName' => GATSBY_WORDPRESS_GUTENBERG_GRAPHQL_GUTENBERG_POSTS_FIELD_NAME,
          'connectionTypeName' => GATSBY_WORDPRESS_GUTENBERG_GRAPHQL_GUTENBERG_POST_CONNECTION_NAME,
          'connectionArgs' => \WPGraphQL\Connection\PostObjects::get_connection_args(),
          'resolve' => function ($id, $args, $context, $info) {
            $resolver = new \WPGraphQL\Data\Connection\PostObjectConnectionResolver(
              $id,
              $args,
              $context,
              $info,
              'post'
            );
            $resolver->setQueryArg('post_type', $this->get_gutenberg_post_types());
            $connection = $resolver->get_connection();
            return $connection;
          },
          'resolveNode' => function ($id, $args, $context, $info) {
            $resolver = $this->get_post_resolver($id);
            return $resolver($id, $context);
          }
        ]);
      },
      100
    );
  }
}
