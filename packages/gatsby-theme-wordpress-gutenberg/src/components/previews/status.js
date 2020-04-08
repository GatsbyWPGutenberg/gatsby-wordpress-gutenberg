import React, { useMemo } from "react"
import styled from "styled-components"

const Aside = styled.aside`
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  display: flex;
`
const Indicator = styled(({ isUpToDate, ...rest }) => <span {...rest} />)`
  border-radius: 50%;
  width: 0.6rem;
  height: 0.6rem;
  background-color: ${props => (props.isUpToDate ? `mediumseagreen` : `orange`)};
`

export const useIsUpToDate = ({ changedTime, modifiedTime }) =>
  useMemo(() => {
    if (changedTime) {
      const date = new Date(changedTime)
      date.setMilliseconds(0)

      return date <= modifiedTime
    }

    return false
  }, [changedTime, modifiedTime])

const Status = ({ isUpToDate }) => (
  <Aside>
    <Indicator isUpToDate={isUpToDate} />
  </Aside>
)

export default Status
