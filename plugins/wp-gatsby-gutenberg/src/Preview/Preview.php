<?php

namespace WPGatsbyGutenberg\Preview;

use WP_Error;
use WP_REST_Request;
use GraphQLRelay\Relay;
use WPGatsby\Admin\Preview as WPGatsbyPreview;
use WPGatsbyGutenberg\Admin\Settings;
use WPGraphQL\Model\Post;
use WPGraphQLGutenberg\PostTypes\BlockEditorPreview;

class Preview
{
	public static function post_preview($post_ID)
	{
		$token = \WPGatsby\GraphQL\Auth::get_token();

		$post = get_post($post_ID);

		if (!$token) {
			// @todo error message?
			return;
		}

		$preview_webhook = WPGatsbyPreview::get_gatsby_preview_webhook();

		$global_relay_id = Relay::toGlobalId('post', absint($post_ID));

		$referenced_node_single_name =
			get_post_type_object($post->post_type)->graphql_single_name ?? null;

		$graphql_endpoint = apply_filters('graphql_endpoint', 'graphql');

		$graphql_url = get_home_url() . '/' . ltrim($graphql_endpoint, '/');

		$post_body = [
			'preview' => true,
			'token' => $token,
			'previewId' => $post_ID,
			'id' => $global_relay_id,
			'singleName' => lcfirst($referenced_node_single_name),
			'isNewPostDraft' => false,
			'isRevision' => false,
			'remoteUrl' => $graphql_url,
		];

		return wp_remote_post($preview_webhook, [
			'body' => wp_json_encode($post_body),
			'headers' => [
				'Content-Type' => 'application/json; charset=utf-8',
			],
			'method' => 'POST',
			'data_format' => 'body',
		]);
	}

	public static function get_gatsby_preview_url($post_ID)
	{
		$post_type_object = \get_post_type_object(get_post_type($post_ID));

		$referenced_node_single_name = lcfirst(
			$post_type_object->graphql_single_name
		);

		$post_url = get_the_permalink($post_ID);
		$path = str_ireplace(get_home_url(), '', $post_url);

		if (strpos($path, '?')) {
			$path = "/$referenced_node_single_name/$post_ID";
		}

		$preview_url = \WPGatsby\Admin\Preview::get_gatsby_preview_instance_url();
		$preview_url = rtrim($preview_url, '/');
		return "$preview_url$path";
	}

	function __construct()
	{
		// this is a fix for node not resolving properly when revision
		// will be fixed in wp-graphql 0.10
		add_filter(
			'graphql_resolve_node_type',
			function ($type, $node) {
				if ($type === null && $node instanceof Post) {
					if ('revision' === $node->post_type) {
						return get_post_type_object(
							get_post_type(get_post($node->ID)->post_parent)
						)->graphql_single_name ?? null;
					}
				}

				return $type;
			},
			10,
			2
		);

		add_action('graphql_register_types', function () {
			register_graphql_field('Block', 'previewUUID', [
				'type' => 'String',
				'description' => __(
					'Preview UUID of the block',
					'wp-gatsby-gutenberg'
				),
				'resolve' => function ($block) {
					return $block->attributes['wpGatsbyGutenbergUUID'];
				},
			]);
		});

		add_action('rest_api_init', function () {
			register_rest_route('wp-gatsby-gutenberg/v1', '/previews/refresh', [
				'methods' => 'POST',
				'callback' => function (WP_REST_Request $request) {
					if (
						'on' !==
						WPGatsbyPreview::get_setting('enable_gatsby_preview')
					) {
						return new WP_Error(
							400,
							__(
								'Gatsby previews are not configured.',
								'wp-gatsby-gutenberg'
							)
						);
					}

					if (!Settings::get_setting('enable_live_preview')) {
						return new WP_Error(
							400,
							__(
								'Gatsby Gutenberg previews are disabled.',
								'wp-gatsby-gutenberg'
							)
						);
					}

					$id = BlockEditorPreview::get_preview_id(
						$request->get_param('postId'),
						$request->get_param('previewPostId')
					);

					if (empty($id)) {
						return new WP_Error(
							400,
							__(
								'Preview data for given post does not exist.',
								'wp-gatsby-gutenberg'
							)
						);
					}

					$result = self::post_preview($id);

					if (is_wp_error($result)) {
						return $result;
					}

					return array_merge($result['response'], [
						'gatsby_preview_url' => self::get_gatsby_preview_url(
							$id
						),
					]);
				},
				'permission_callback' => function () {
					return current_user_can('edit_others_posts');
				},
				'args' => [
					'postId' => [
						'required' => true,
						'validate_callback' => 'is_numeric',
					],
					'previewPostId' => [
						'required' => true,
						'validate_callback' => 'is_numeric',
					],
				],
			]);
		});
	}
}
