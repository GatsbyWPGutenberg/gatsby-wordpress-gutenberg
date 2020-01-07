import React, { memo } from 'react';
import { graphql } from 'gatsby';

export const query = graphql`
  fragment UnknownBlock on WP_Block {
    saveContent
  }
`;

export default memo(({ saveContent }) => {
  return <div dangerouslySetInnerHTML={{ __html: saveContent }} />;
});
