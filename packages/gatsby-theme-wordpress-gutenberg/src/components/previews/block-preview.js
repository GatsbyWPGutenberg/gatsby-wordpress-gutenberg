import React, { useMemo } from "react"
import styled, { keyframes } from "styled-components"
import { useIsUpToDate } from "./status"

const animation = keyframes`
  0% {
      background-size: 200% 100%;
      background-position: left -31.25% top 0%;
  }
  50% {
      background-size: 800% 100%;
      background-position: left -49% top 0%;
  }
  100% {
      background-size: 400% 100%;
      background-position: left -102% top 0%;
  }
`

const Progress = styled.progress`
  appearance: none;
  border: none;
  height: 0.25rem;
  color: rgb(102, 51, 153);
  background-color: rgba(102, 51, 153, 0.12);
  font-size: 1rem;
  width: 100%;

  &::-webkit-progress-bar {
    background-color: transparent;
  }

  &:indeterminate {
    background-size: 200% 100%;
    background-image: linear-gradient(
      to right,
      transparent 50%,
      currentColor 50%,
      currentColor 60%,
      transparent 60%,
      transparent 71.5%,
      currentColor 71.5%,
      currentColor 84%,
      transparent 84%
    );
    animation: ${animation} 2s infinite linear;

    &::-moz-progress-bar {
      background-color: transparent;
    }

    &::-ms-fill {
      animation-name: none;
    }
  }
`

const findBlock = ({ blocks, clientId }) => {
  for (const block of blocks) {
    if (block.clientId === clientId) {
      return block
    }

    const result = findBlock({ blocks: block.innerBlocks || [], clientId })

    if (result) {
      return result
    }
  }

  return null
}

export const useBlockPreview = () => {
  let clientId = null
  let changedTime = null

  if (typeof window !== `undefined`) {
    const params = new URLSearchParams(window.location.search)
    clientId = params.get(`clientId`) || null
    changedTime = params.get(`changedTime`) || null

    if (changedTime) {
      changedTime = new Date(changedTime)
    }
  }

  return {
    clientId,
    changedTime,
    isBlockPreview: !!clientId,
  }
}
const BlockPreview = ({ changedTime, modifiedTime, clientId, blocks, Blocks }) => {
  const isUpToDate = useIsUpToDate({ changedTime, modifiedTime })

  const block = useMemo(() => findBlock({ blocks, clientId }), [blocks, clientId])
  if (!isUpToDate || !block) {
    return <Progress />
  }

  return <Blocks blocks={[block]} />
}

export default BlockPreview
