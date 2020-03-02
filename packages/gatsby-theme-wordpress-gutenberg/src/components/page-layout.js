import { useBlockPreview } from "./previews/block-preview"

const PageLayout = ({ children, pageElement }) => {
  const { isBlockPreview } = useBlockPreview()

  if (isBlockPreview) {
    return pageElement
  }

  return children
}

export default PageLayout
