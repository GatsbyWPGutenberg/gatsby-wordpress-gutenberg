<?php

namespace WpGatsbyGutenberg\Model;

use WP_Query;
use WP_REST_Request;
use WPGraphQL\Utils\Utils;

if (!defined('WP_GATSBY_GUTENBERG_GUTENBERG_PREVIEW_POST_TYPE_NAME')) {
	define(
		'WP_GATSBY_GUTENBERG_GUTENBERG_PREVIEW_POST_TYPE_NAME',
		'wgg_preview'
	);
}

if (!defined('WP_GATSBY_GUTENBERG_GUTENBERG_PREVIEW_GRAPHQL_SINGLE_NAME')) {
	define(
		'WP_GATSBY_GUTENBERG_GUTENBERG_PREVIEW_GRAPHQL_SINGLE_NAME',
		'GatsbyGutenbergPreview'
	);
}

if (!defined('WP_GATSBY_GUTENBERG_GUTENBERG_PREVIEW_GRAPHQL_PLURAL_NAME')) {
	define(
		'WP_GATSBY_GUTENBERG_GUTENBERG_PREVIEW_GRAPHQL_PLURAL_NAME',
		'GatsbyGutenbergPreviews'
	);
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

	public function __construct($preview_url)
	{
		add_filter('wgg_gutenberg_post_types', function ($post_types) {
			return array_filter($post_types, function ($post_type) {
				return $post_type !== self::$post_type;
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

		add_action('rest_api_init', function () use ($preview_url) {
			register_rest_route('gatsby-gutenberg/v1', '/previews/batch', array(
				'methods' => 'POST',
				'callback' => function (WP_REST_Request $request) {
					$batch = $request->get_param('batch');

					foreach ($batch as $post_id => $data) {
						foreach ($data['blocksByCoreBlockId']
							as $core_block_id => $blocks) {
							$result = self::insert_preview(
								$core_block_id,
								$post_id,
								[
									'meta_input' => [
										'blocks' => $blocks
									]
								]
							);

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

						return [
							'batch' => [
								// TODO: Add created/updated entitites to response
							]
						];
					}
				},
				'permission_callback' => function () {
					return current_user_can('edit_others_posts');
				}
			));

			register_rest_route(
				'gatsby-gutenberg/v1',
				'/previews/(?P<id>\\d+)',
				array(
					'methods' => 'POST',
					'callback' => function (WP_REST_Request $request) use (
						$preview_url
					) {
						if (empty($preview_url)) {
							return $this->get_preview_not_configured_error();
						}

						$url =
							$preview_url .
							'/___gutenberg/previews/' .
							$request->get_param('id');

						$result = $this->ensure_preview(
							\wp_remote_request($url, [
								'method' => 'POST',
								'body' => json_encode($request->get_params()),
								'headers' => [
									'Content-Type' =>
									'application/json; charset=utf-8'
									// TODO: Add Auth
								]
							])
						);

						if (\is_wp_error($result)) {
							return $result;
						}

						$data = json_decode(
							wp_remote_retrieve_body($result),
							true
						);

						return rest_ensure_response(array_merge($data, [
							'previewUrl' => $data['previewUrl'] ? apply_filters(
								'wgg_gatsby_preview_url',
								$preview_url . $data['previewUrl']
							) : null
						]));
					},
					'args' => [
						'id' => [
							'required' => true,
							'validate_callback' => 'is_numeric'
						],
						'changedTime' => [
							'required' => true
						]
					],
					'permission_callback' => function () {
						return current_user_can('edit_others_posts');
					}
				)
			);
		});

		add_action('graphql_register_types', function ($type_registry) {
			register_graphql_field(
				WP_GATSBY_GUTENBERG_GUTENBERG_PREVIEW_GRAPHQL_SINGLE_NAME,
				'gutenbergIsPreview',
				[
					'type' => ['non_null' => 'Boolean'],
					'resolve' => function () {
						return true;
					}
				]
			);

			register_graphql_field(
				WP_GATSBY_GUTENBERG_GUTENBERG_PREVIEW_GRAPHQL_SINGLE_NAME,
				'gutenbergBlocksJSON',
				[
					'type' => 'String',
					'resolve' => function ($model) {
						$value = get_post_meta($model->ID, 'blocks', true);
						return empty($value) ? null : json_encode($value);
					}
				]
			);

			register_graphql_field(
				WP_GATSBY_GUTENBERG_GUTENBERG_PREVIEW_GRAPHQL_SINGLE_NAME,
				'gutenbergPostId',
				[
					'type' => ['non_null' => 'Int'],
					'resolve' => function ($model) {
						return get_post_meta($model->ID, 'postId', true);
					}
				]
			);

			register_graphql_field(
				WP_GATSBY_GUTENBERG_GUTENBERG_PREVIEW_GRAPHQL_SINGLE_NAME,
				'gutenbergPreviewPostId',
				[
					'type' => 'Int',
					'resolve' => function ($model) {
						return get_post_meta($model->ID, 'previewPostId', true);
					}
				]
			);

			register_graphql_field(
				WP_GATSBY_GUTENBERG_GUTENBERG_PREVIEW_GRAPHQL_SINGLE_NAME,
				'gutenbergSlug',
				[
					'type' => 'String',
					'resolve' => function ($model) {
						$value = get_post_meta($model->ID, 'slug', true);
						return empty($value) ? null : $value;
					}
				]
			);

			register_graphql_field(
				WP_GATSBY_GUTENBERG_GUTENBERG_PREVIEW_GRAPHQL_SINGLE_NAME,
				'gutenbergLink',
				[
					'type' => 'String',
					'resolve' => function ($model) {
						$value = get_post_meta($model->ID, 'link', true);
						return empty($value) ? null : $value;
					}
				]
			);

			register_graphql_field(
				WP_GATSBY_GUTENBERG_GUTENBERG_PREVIEW_GRAPHQL_SINGLE_NAME,
				'gutenbergModifiedTime',
				[
					'type' => 'String',
					'resolve' => function ($model) {
						return Utils::prepare_date_response(
							get_post($model->ID)->post_modified_gmt
						) . 'Z';
					}
				]
			);
		});
	}

	protected function ensure_preview($result)
	{
		$code = wp_remote_retrieve_response_code($result);
		if ($code !== 200) {
			return new \WP_Error(
				'preview_not_available',
				__('Preview not availabe', 'wp-gatsby-gutenberg'),
				array('status' => !empty($code) ? $code : 503)
			);
		}

		return $result;
	}

	protected function get_preview_not_configured_error()
	{
		return new \WP_Error(
			'preview_not_configured',
			__('Preview not configured', 'wp-gatsby-gutenberg'),
			array('status' => 403)
		);
	}
}
