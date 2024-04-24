import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { Message as message } from "@arco-design/web-react"

import { useDigestDetailStore } from "@/stores/digest-detail"
// utils
import { buildSessionsFromDigest } from "@/utils/session"
// 组件
import { DigestDetailContent } from "./digest-detail-content"
import { Header } from "./header"
import { AskFollowUpModal } from "@/components/ask-follow-up-modal/index"
// request
import getAIGCContent from "@/requests/getAIGCContent"
// styles
import "./digest-detail.scss"
import { Digest } from "@/types"
import { useTranslation } from "react-i18next"

/**
 * 1. same as thread，but only for read
 * 2. if user want to start ask following，then need create a new thread
 *
 */
export const DigestTail = () => {
  const params = useParams<{ digestId: string }>()
  const [askFollowUpVisible, setAskFollowUpVisible] = useState(false)

  const digestDetailStore = useDigestDetailStore()
  const { t } = useTranslation()

  const handleGetDetail = async (digestId: string) => {
    try {
      const newRes = await getAIGCContent({
        body: {
          contentId: digestId,
        },
      })

      if (!newRes?.success) {
        throw new Error(newRes?.errMsg)
      }

      console.log("newRes", newRes)
      digestDetailStore.updateDigest(newRes?.data as Digest)
    } catch (err) {
      message.error(t("contentDetail.list.fetchErr"))
    }
  }

  const handleAskFollowUp = () => {
    setAskFollowUpVisible(true)
  }

  useEffect(() => {
    if (params?.digestId) {
      console.log("params", params)
      handleGetDetail(params?.digestId as string)
    }
  }, [])

  const sessions = buildSessionsFromDigest(digestDetailStore?.digest as Digest)

  return (
    <div
      className="digest-detail-container"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}>
      <Header digest={digestDetailStore?.digest as Digest} />
      <DigestDetailContent
        sessions={sessions}
        handleAskFollowUp={handleAskFollowUp}
      />

      {askFollowUpVisible ? (
        <AskFollowUpModal
          visible={askFollowUpVisible}
          setVisible={visible => setAskFollowUpVisible(visible)}
          aigcContent={digestDetailStore?.digest as Digest}
        />
      ) : null}
    </div>
  )
}
