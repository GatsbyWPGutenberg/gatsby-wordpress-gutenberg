<?php

namespace WpGatsbyGutenberg\Graphql;

if (!defined('WP_GATSBY_GUTENBERG_GRAPHQL_POST_TYPE_INTERFACE_NAME')) {
  define('WP_GATSBY_GUTENBERG_GRAPHQL_POST_TYPE_INTERFACE_NAME', 'GutenbergPost');
}

if (!defined('WP_GATSBY_GUTENBERG_GRAPHQL_GUTENBERG_POSTS_FIELD_NAME')) {
  define('WP_GATSBY_GUTENBERG_GRAPHQL_GUTENBERG_POSTS_FIELD_NAME', 'gutenbergPosts');
}

if (!defined('WP_GATSBY_GUTENBERG_GRAPHQL_GUTENBERG_POST_CONNECTION_NAME')) {
  define('WP_GATSBY_GUTENBERG_GRAPHQL_GUTENBERG_POST_CONNECTION_NAME', 'GutenbergPostConnection');
}

if (!defined('WP_GATSBY_GUTENBERG_GRAPHQL_GUTENBERG_DYNAMIC_BLOCK_NAMES_FIELD_NAME')) {
  define('WP_GATSBY_GUTENBERG_GRAPHQL_GUTENBERG_DYNAMIC_BLOCK_NAMES_FIELD_NAME', 'gutenbergDynamicBlockNames');
}

if (!defined('WP_GATSBY_GUTENBERG_GRAPHQL_GUTENBERG_DYNAMIC_BLOCK_RENDER_FIELD_NAME')) {
  define('WP_GATSBY_GUTENBERG_GRAPHQL_GUTENBERG_DYNAMIC_BLOCK_RENDER_FIELD_NAME', 'gutenbergRenderDynamicBlock');
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
      'wgg_post_graphql_type',
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

  protected function get_gutenberg_post_types_in_graphql()
  {
    return array_filter(\WPGraphQL::get_allowed_post_types(), function ($post_type) {
      return in_array($post_type, $this->get_gutenberg_post_types());
    });
  }

  public function get_gutenberg_graphql_types()
  {
    return apply_filters(
      'wgg_gutenberg_graphql_types',
      array_map(function ($post_type) {
        return get_post_type_object($post_type)->graphql_single_name;
      }, $this->get_gutenberg_post_types_in_graphql())
    );
  }

  public function get_post_resolver($post_id)
  {
    return apply_filters('wgg_post_resolver', [\WPGraphQL\Data\DataSource::class, 'resolve_post_object'], $post_id);
  }

  public function __construct()
  {
    add_filter(
      'register_post_type_args',
      function ($args, $post_type) {
        if ($post_type === 'wp_block') {
          $args['show_in_graphql'] = true;
          $args['graphql_single_name'] = 'ReusableBlock';
          $args['graphql_plural_name'] = 'ReusableBlocks';
        }

        return $args;
      },
      10,
      2
    );

    $gutenberg_post_type_interface_config = [
      'resolveType' => function ($model) {
        return $this->resolve_graphql_type($model);
      },
      'fields' => [
        'id' => [
          'type' => ['non_null' => 'ID']
        ],
        'gutenbergPostContent' => [
          'type' => 'String',
          'resolve' => function ($model) {
            if (current_user_can('edit_post', $model->ID)) {
              return get_post($model->ID)->post_content;
            }

            return null;
          }
        ],
        'gutenbergPostId' => [
          'type' => 'Int',
          'resolve' => function ($model) {
            return $model->ID;
          }
        ],
        'gutenbergPermalink' => [
          'type' => 'String',
          'resolve' => function ($model) {
            if (current_user_can('edit_post', $model->ID)) {
              return get_permalink($model->ID);
            }

            return null;
          }
        ]
      ]
    ];

    add_filter('graphql_wp_object_type_config', function ($config) use ($gutenberg_post_type_interface_config) {
      if (in_array(strtolower($config['name']), array_map('strtolower', $this->get_gutenberg_graphql_types()))) {
        $interfaces = $config['interfaces'];

        $config['interfaces'] = function () use ($interfaces) {
          return array_merge($interfaces(), [
            $this->type_registry->get_type(WP_GATSBY_GUTENBERG_GRAPHQL_POST_TYPE_INTERFACE_NAME)
          ]);
        };

        $fields_cb = $config['fields'];

        $config['fields'] = function () use ($fields_cb, $gutenberg_post_type_interface_config) {
          $fields = $fields_cb();

          foreach ($gutenberg_post_type_interface_config['fields'] as $key => $value) {
            if (substr($key, 0, strlen('gutenberg')) === 'gutenberg') {
              $fields[$key] = $this->type_registry
                ->get_type(WP_GATSBY_GUTENBERG_GRAPHQL_POST_TYPE_INTERFACE_NAME)
                ->getField($key);
            }
          }

          return $fields;
        };
      }
      return $config;
    });

    add_action(
      'graphql_register_types',
      function ($type_registry) use ($gutenberg_post_type_interface_config) {
        $this->type_registry = $type_registry;

        register_graphql_interface_type(
          WP_GATSBY_GUTENBERG_GRAPHQL_POST_TYPE_INTERFACE_NAME,
          $gutenberg_post_type_interface_config
        );
        register_graphql_field('RootQuery', WP_GATSBY_GUTENBERG_GRAPHQL_GUTENBERG_DYNAMIC_BLOCK_NAMES_FIELD_NAME, [
          'type' => ['non_null' => ['list_of' => ['non_null' => 'String']]],
          'resolve' => function () {
            return get_dynamic_block_names();
          }
        ]);

        register_graphql_field('RootQuery', WP_GATSBY_GUTENBERG_GRAPHQL_GUTENBERG_DYNAMIC_BLOCK_RENDER_FIELD_NAME, [
          'type' => 'String',
          'args' => [
            'blockName' => ['type' => 'String'],
            'attributesJSON' => ['type' => 'String']
          ],
          'resolve' => function ($source, $args) {
            $registry = \WP_Block_Type_Registry::get_instance();
            $server_block_type = $registry->get_registered($args['blockName']);

            if (isset($server_block_type) && $server_block_type->is_dynamic()) {
              return $server_block_type->render(json_decode($args['attributesJSON'], true));
            }

            return null;
          }
        ]);

        register_graphql_connection([
          'fromType' => 'RootQuery',
          'toType' => WP_GATSBY_GUTENBERG_GRAPHQL_POST_TYPE_INTERFACE_NAME,
          'fromFieldName' => WP_GATSBY_GUTENBERG_GRAPHQL_GUTENBERG_POSTS_FIELD_NAME,
          'connectionTypeName' => WP_GATSBY_GUTENBERG_GRAPHQL_GUTENBERG_POST_CONNECTION_NAME,
          'connectionArgs' => \WPGraphQL\Connection\PostObjects::get_connection_args(),
          'resolve' => function ($id, $args, $context, $info) {
            $resolver = new \WPGraphQL\Data\Connection\PostObjectConnectionResolver(
              $id,
              $args,
              $context,
              $info,
              'post'
            );
            $resolver->setQueryArg('post_type', $this->get_gutenberg_post_types_in_graphql());
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
