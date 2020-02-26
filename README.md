# Gatsby WordPress Gutenberg Framework

<a href="https://www.netlify.com">
  <img src="https://www.netlify.com/img/global/badges/netlify-color-accent.svg"/>
</a>

<br>
<br>
This is a WIP, work is done in `develop` branch.

See all the thoughts to the projects here: https://github.com/pristas-peter/gatsby-wordpress-gutenberg/issues/1

## Idea

The idea of the framework, is to deliver a set of tools, that should ease the work with WordPress, Gutenberg blocks and Gatsby.

The framework will consist of two main packages.

### 1. gatsby-source-wordpress-gutenberg

This is the backbone of the framework which takes Gatsby's WordPress post node representation and acts on post's html content change. This will transform post's html content into structured content of Gatsby's nodes which will represent Gutenberg blocks. The GraphQL type representation should be similar to types of [wp-graphql-gutenberg plugin](https://github.com/pristas-peter/wp-graphql-gutenberg), but this framework won't use this plugin internally and rather do a rewrite in JS using puppeteer which will open WordPress Gutenberg admin in headless browser and do the transformation itself. This should fix the scaling problem of wp-graphql-gutenberg, where you have to save the post before being able to query it in WPGraphQL.

### 2. gatsby-theme-wordpress-gutenberg

This plugin should do the mapping of Gatsby's post block node to react component file and then be able to generate <Blocks> component which will render all blocks/components for the current post.

The current implementation works using gatsby-source-filesystem to track directory with react component files which have defined GraphQL fragments on Gutenberg block type. Upon scanning the source file you can then know the mapping of block->component_file (you know which component has a fragment on which block type). This way you only import blocks/components which are on that post so everything is still optimized.

Then the plugin takes the the post content blocks and generates the block component file which represents all blocks of the given post (recursively supporting inner blocks, so the blocks's innerBlocks map to components children). A small example below.

Since this is a Gatsby theme, we can implement a set of components for core blocks which can be shadowed further on in userland.
