const { default: ApolloClient, gql } = require('apollo-boost');
const fetch = require('node-fetch');
const { default: pluck } = require('graphql-tag-pluck');
const { print, parse, Kind } = require('graphql');
const path = require('path');
const fs = require('fs-extra');

const fetchAllGutenbergPosts = async ({ client, first, after }) => {
  const posts = [];

  const {
    data: { postsWithBlocks },
  } = await client.query({
    query: gql`
      query GetAllPostsWithBlocks($first: Int!, $after: String) {
        postsWithBlocks(first: $first, after: $after) {
          edges {
            node {
              __typename
              id
              blocksJSON
              link
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `,
    variables: {
      first,
      after,
    },
  });

  postsWithBlocks.edges.forEach(({ node }) => {
    posts.push(node);
  });

  if (postsWithBlocks.pageInfo.hasNextPage) {
    const nextPosts = await fetchAllGutenbergPosts({ client, first, after: postsWithBlocks.pageInfo.endCursor });

    return [...posts, ...nextPosts];
  }

  return posts;
};

const getBlocksMetadata = ({ blocks, currentInnerBlocksLevel = 1 }) => {
  const blockTypenames = new Set();
  let innerBlocksLevel = currentInnerBlocksLevel;

  blocks.forEach(block => {
    blockTypenames.add(`WP_${block.__typename}`);

    if (block.innerBlocks.length) {
      const result = getBlocksMetadata({
        blocks: block.innerBlocks,
        currentInnerBlocksLevel: currentInnerBlocksLevel + 1,
      });

      result.blockTypenames.forEach(blockTypename => {
        blockTypenames.add(blockTypename);
      });

      innerBlocksLevel = result.innerBlocksLevel;
    }
  });

  return {
    blockTypenames,
    innerBlocksLevel,
  };
};

const getSourceComponentFiles = ({ sourceComponentFileByBlockTypename, blockTypenames }) => {
  let hasUnknownBlock = false;
  const sourceComponentFiles = [];
  const processedBlockTypenames = new Set();

  blockTypenames.forEach(blockTypename => {
    if (processedBlockTypenames.has(blockTypename)) {
      return;
    }

    const sourceComponentFile = sourceComponentFileByBlockTypename[blockTypename];

    if (sourceComponentFile) {
      sourceComponentFiles.push(sourceComponentFile);
    } else {
      hasUnknownBlock = true;
    }

    processedBlockTypenames.add(blockTypename);
  });

  if (hasUnknownBlock) {
    sourceComponentFiles.push(sourceComponentFileByBlockTypename['WP_Block']);
  }

  return sourceComponentFiles;
};

const generateBlocks = ({ sourceComponentFiles, id, postTypename, nodeId, innerBlocksLevel }) => {
  const banner = `/* eslint-disable */
/* Warning: this file is autogerated, any changes would be lost */
`;

  if (!sourceComponentFiles.length) {
    return `${banner}
export default () => null;
`;
  }

  const fragmentName = `GutenbergBlocks${id}`;

  const getFragment = (level = 1) => {
    let fragment = level === 1 ? `{ ...${fragmentName}` : ` innerBlocks { ...${fragmentName}`;

    if (level < innerBlocksLevel) {
      fragment += getFragment(level + 1);
    }

    fragment += ` }`;

    return fragment;
  };

  return `
${banner}
import React from 'react';
import { graphql } from 'gatsby';
${sourceComponentFiles
  .map(({ absolutePath, fragmentName }) => `import ${fragmentName} from '${absolutePath}';`)
  .join('\n')}

const Blocks = ({blocks}) => {
  return (
    <>
      {blocks.map((block, i) => {
        if (!block) {
          return null;
        }

        const children = block.innerBlocks ? <Blocks blocks={block.innerBlocks} /> : null;
        ${sourceComponentFiles
          .map(({ fragmentName, blockTypename }) => {
            return blockTypename === 'WP_Block'
              ? `
        return <${fragmentName} {...block} children={children} key={i} />;`
              : `
        if (block.__typename === '${blockTypename}') {
          return <${fragmentName} {...block} children={children} key={i} />;
        }`;
          })
          .join('\n')}
      })}
    </>
  );
};

export const pageQuery = graphql\`
  fragment ${fragmentName} on WP_Block {
    __typename
    ${sourceComponentFiles.map(({ fragmentName }) => `...${fragmentName}`).join('\n    ')}
  }
  query GetGutenbergBlocks${id} {
    wp {
      node(id: "${nodeId}") {
        ...on ${postTypename} {
          blocks ${getFragment()}
        }
      }
    }
  }\`;

export default ({data}) => 
  <Blocks blocks={data.wp.node.blocks} />;
`;
};

const createPages = async ({ graphql, actions: { createPage } }) => {
  const { data, errors } = await graphql(`
    query {
      allGutenbergPage {
        edges {
          node {
            component
            path
          }
        }
      }
    }
  `);

  if (errors) {
    throw errors;
  }

  if (data) {
    data.allGutenbergPage.edges.forEach(({ node: { component, path } }) => {
      createPage({
        path,
        component,
      });
    });
  }
};

exports.sourceNodes = async ({ actions, createContentDigest, createNodeId }, { linkOptions }) => {
  const client = new ApolloClient({
    fetch,
    ...linkOptions,
    // onError: async ({ operation, networkError: { response } }) => {
    //   console.error(print(operation.query), response);
    // },
  });

  const posts = await fetchAllGutenbergPosts({ client, first: 100 });

  await Promise.all(
    posts.map(async blocksPost => {
      const { createNode } = actions;

      const { id, __typename, blocksJSON, ...rest } = blocksPost;
      const [postType, postId] = Buffer.from(id, 'base64')
        .toString()
        .split(':');
      const node = {
        ...rest,
        id: createNodeId(`gutenberg-post-${id}`),
        postTypename: __typename,
        postType,
        postId,
        nodeId: id,
        blocksJSON,
        internal: {
          type: `GutenbergPost`,
        },
      };

      node.internal.contentDigest = createContentDigest(JSON.stringify(node));
      await createNode(node);
    }),
  );
};

exports.createSchemaCustomization = ({ actions }) => {
  const { createTypes } = actions;
  const typeDefs = `
    type GutenbergPage implements Node {
      id: ID!
      component: String!
      path: String!
    }
  `;
  createTypes(typeDefs);
};

exports.onCreateNode = async ({ node, createNodeId, createContentDigest, actions }) => {
  const { createNode, createParentChildLink } = actions;

  if (node.internal.type === 'File' && node.sourceInstanceName === 'gutenberg-source-components') {
    const document = parse(
      await pluck.fromFile(node.absolutePath, {
        modules: [
          {
            name: 'gatsby',
            identifier: 'graphql',
          },
        ],
      }),
    );

    let fragment = null;
    let typename = null;

    document.definitions.map(async d => {
      if (d.kind === Kind.FRAGMENT_DEFINITION) {
        if (/WP_.*Block$/.test(d.typeCondition.name.value)) {
          typename = d.typeCondition.name.value;
          fragment = d;
        }
      }
    });

    if (fragment && typename) {
      const childNode = {
        id: createNodeId(`gutenberg-source-component-file-${node.relativePath}`),
        fragmentName: fragment.name.value,
        fragment: print(fragment),
        absolutePath: node.absolutePath,
        blockTypename: fragment.typeCondition.name.value,
        parent: node.id,
        internal: {
          type: 'GutenbergSourceComponentFile',
        },
      };

      childNode.internal.contentDigest = createContentDigest(JSON.stringify(childNode));

      await createNode(childNode);
      createParentChildLink({ parent: node, child: childNode });
    }
  }
};

exports.createPages = async ({ graphql, createNodeId, createContentDigest, actions }) => {
  const { createNode } = actions;

  const {
    data: { allGutenbergPost, allGutenbergSourceComponentFile },
    errors,
  } = await graphql(`
    query {
      allGutenbergPost {
        edges {
          node {
            blocksJSON
            postId
            postTypename
            nodeId
            link
          }
        }
      }
      allGutenbergSourceComponentFile {
        edges {
          node {
            blockTypename
            fragmentName
            fragment
            absolutePath
          }
        }
      }
    }
  `);

  if (errors) {
    throw errors;
  }

  const sourceComponentFileByBlockTypename = allGutenbergSourceComponentFile.edges.reduce((obj, { node }) => {
    obj[node.blockTypename] = node;

    return obj;
  }, {});

  await Promise.all(
    allGutenbergPost.edges.map(async ({ node }) => {
      const { blockTypenames, innerBlocksLevel } = getBlocksMetadata({ blocks: JSON.parse(node.blocksJSON) || [] });
      const sourceComponentFiles = getSourceComponentFiles({
        blockTypenames,
        sourceComponentFileByBlockTypename,
      });

      const componentPath = path.join(
        process.cwd(),
        '.cache',
        'gatsby-theme-wp-graphql-gutenberg',
        'components',
        `blocks`,
        `${node.postId}.js`,
      );

      const source = await generateBlocks({
        ...node,
        sourceComponentFiles,
        id: node.postId,
        innerBlocksLevel,
        postTypename: `WP_${node.postTypename}`,
      });

      const oldSource = await fs.readFile(componentPath, 'utf-8').catch(() => {
        return null;
      });

      if (oldSource !== source) {
        await fs.outputFile(componentPath, source);
      }

      const pageNode = {
        id: createNodeId(`gutenberg-page-${node.postId}`),
        source,
        component: path.resolve(componentPath),
        path: new URL(node.link).pathname,
        blocksJSON: node.blocksJSON,
        internal: {
          type: 'GutenbergPage',
        },
      };

      pageNode.internal.contentDigest = createContentDigest(JSON.stringify(pageNode));
      await createNode(pageNode);
    }),
  );

  await createPages({ graphql, actions });
};

exports.onCreateWebpackConfig = ({ actions, getConfig }) => {
  actions.setWebpackConfig({
    resolve: {
      modules: [path.resolve(path.join(process.cwd(), '.cache'))],
    },
  });
};
