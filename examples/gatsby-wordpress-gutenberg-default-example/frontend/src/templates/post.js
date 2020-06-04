import React from "react"
import { graphql } from "gatsby"

export const pageQuery = graphql`
  query GetPost($id: String) {
    wpPost(id: { eq: $id }) {
      Blocks
      title
    }
  }
`
export default (props) => {
  console.log(props)

  const { Blocks } = props.data.wpPost

  return (
    <>
      <h1>{props.data?.wpPost.title}</h1>
      <Blocks />
    </>
  )
}
