import { Button, Divider, Empty, Input, List, Avatar, Message as message, Affix, Spin } from '@arco-design/web-react';
import { HiLink } from 'react-icons/hi';
import { HiOutlineXMark } from 'react-icons/hi2';
import { useEffect, useState } from 'react';

// utils
import { isUrl } from '@refly/utils/isUrl';
import { genUniqueId } from '@refly-packages/utils/id';
import {
  LinkMeta,
  useImportResourceStore,
  useImportResourceStoreShallow,
} from '@refly-packages/ai-workspace-common/stores/import-resource';
// request
import getClient from '@refly-packages/ai-workspace-common/requests/proxiedRequest';
import { UpsertResourceRequest } from '@refly/openapi-schema';
import { useTranslation } from 'react-i18next';
import { useAddNode } from '@refly-packages/ai-workspace-common/hooks/use-add-node';
import { useHandleSiderData } from '@refly-packages/ai-workspace-common/hooks/use-handle-sider-data';
import { useCanvasStore } from '@refly-packages/ai-workspace-common/stores/canvas';

const { TextArea } = Input;

export const ImportFromWeblink = () => {
  const { t } = useTranslation();
  const [linkStr, setLinkStr] = useState('');
  const { scrapeLinks, setScrapeLinks, setImportResourceModalVisible, insertNodePosition } =
    useImportResourceStoreShallow((state) => ({
      scrapeLinks: state.scrapeLinks,
      setScrapeLinks: state.setScrapeLinks,
      setImportResourceModalVisible: state.setImportResourceModalVisible,
      insertNodePosition: state.insertNodePosition,
    }));

  const { addNode } = useAddNode(useCanvasStore.getState().currentCanvasId);

  const [saveLoading, setSaveLoading] = useState(false);
  const { getLibraryList } = useHandleSiderData();

  const scrapeSingleUrl = async (key: string, url: string) => {
    const { scrapeLinks } = useImportResourceStore.getState();
    try {
      const { data, error } = await getClient().scrape({ body: { url } });

      if (error) {
        throw error;
      }

      const { title, description, image } = data?.data ?? {};

      const newLinks = scrapeLinks.map((link) => {
        if (link?.key === key) {
          link.title = title;
          link.description = description;
          link.image = image;
          link.isHandled = true;
        }

        return link;
      });
      setScrapeLinks(newLinks);
    } catch (err) {
      console.log('fetch url error, silent ignore');
      const newLinks = scrapeLinks.map((link) => {
        if (link?.key === key) {
          link.isError = true;
        }

        return link;
      });
      setScrapeLinks(newLinks);
    }
  };

  const scrapeLink = async (linkStr: string) => {
    try {
      const links: LinkMeta[] = linkStr
        .split('\n')
        .filter((str) => str && isUrl(str))
        .map((url) => ({
          url: url.trim(),
          key: genUniqueId(),
          isHandled: false,
        }));

      if (links?.length === 0) {
        message.warning(t('resource.import.linkFormatError'));
        return;
      }

      const { scrapeLinks } = useImportResourceStore.getState();
      setScrapeLinks(scrapeLinks.concat(links));
      setLinkStr('');

      // Scrape the link information
      await Promise.all(links.map((link) => scrapeSingleUrl(link.key, link.url)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    const { scrapeLinks } = useImportResourceStore.getState();

    if (scrapeLinks?.length === 0) {
      message.warning(t('resource.import.emptyLink'));
      return;
    }

    const batchCreateResourceData: UpsertResourceRequest[] = scrapeLinks.map((link) => {
      return {
        resourceType: 'weblink',
        title: link?.title,
        data: {
          url: link?.url,
          title: link?.title,
        },
      };
    });

    setSaveLoading(true);
    const { data } = await getClient().batchCreateResource({
      body: batchCreateResourceData,
    });
    setSaveLoading(false);

    if (!data?.success) {
      return;
    }
    getLibraryList();
    message.success(t('common.putSuccess'));
    setScrapeLinks([]);
    setImportResourceModalVisible(false);
    setLinkStr('');

    const resources = (Array.isArray(data?.data) ? data?.data : []).map((resource) => ({
      id: resource.resourceId,
      title: resource.title,
      domain: 'resource',
      contentPreview: resource.contentPreview,
    }));
    resources.forEach((resource, index) => {
      const nodePosition = insertNodePosition
        ? {
            x: insertNodePosition?.x + index * 300,
            y: insertNodePosition?.y,
          }
        : null;
      addNode({
        type: 'resource',
        data: {
          title: resource.title,
          entityId: resource.id,
          contentPreview: resource.contentPreview,
        },
        position: nodePosition,
      });
    });
  };

  return (
    <div className="h-full flex flex-col min-w-[500px] box-border intergation-import-from-weblink">
      {/* header */}
      <div className="flex items-center gap-x-[8px] pt-[12px] px-[12px]">
        <span className="w-[18px] h-[18px] rounded-[4px] bg-[#f1f1f0] box-shadow-[0_1px_3px_0_rgba(0,0,0,0.1)] flex items-center justify-center">
          <HiLink />
        </span>
        <div className="text-[16px] font-bold">{t('resource.import.fromWeblink')}</div>
      </div>

      <Divider style={{ marginTop: 10, marginBottom: 10 }} />

      {/* content */}
      <div className="flex-grow overflow-y-auto px-[12px] box-border">
        <div>
          <TextArea
            placeholder={t('resource.import.webLinkPlaceholer')}
            rows={4}
            autoSize={{
              minRows: 4,
              maxRows: 4,
            }}
            value={linkStr}
            onChange={(value) => setLinkStr(value)}
          />
          <Button
            type="primary"
            long
            style={{ marginTop: 16 }}
            disabled={!linkStr}
            onClick={() => {
              scrapeLink(linkStr);
            }}
          >
            {t('common.add')}
          </Button>
        </div>

        <div className="mt-[24px]">
          <h2 className="text-sm font-bold text-[#00000080]">{t('resource.import.waitingList')}</h2>
          <div className="mt-[12px]">
            {scrapeLinks?.length > 0 ? (
              <List
                style={{ marginBottom: 48, border: 'none' }}
                dataSource={scrapeLinks}
                render={(item, index) => <RenderItem item={item} key={index} />}
              />
            ) : (
              <Empty />
            )}
          </div>
        </div>
      </div>

      {/* footer */}
      <div className="w-full flex justify-between items-center border-t border-solid border-[#e5e5e5] border-x-0 border-b-0 p-[16px] rounded-none">
        <div className="flex items-center gap-x-[8px]">
          <p className="font-bold whitespace-nowrap text-md text-[#00968f]">
            {t('resource.import.linkCount', { count: scrapeLinks?.length || 0 })}
          </p>
        </div>

        <div className="flex items-center gap-x-[8px] flex-shrink-0">
          <Button style={{ marginRight: 8 }} onClick={() => setImportResourceModalVisible(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="primary" onClick={handleSave} disabled={scrapeLinks.length === 0} loading={saveLoading}>
            {t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );
};

const RenderItem = (props: { item: LinkMeta }) => {
  const importResourceStore = useImportResourceStore();
  const { item } = props;
  const { t } = useTranslation();

  return (
    <Spin loading={!item.isHandled && !item.isError} style={{ width: '100%', minHeight: 80 }}>
      <List.Item
        actions={[
          <Button
            type="text"
            className="assist-action-item"
            onClick={() => {
              window.open(item?.url, '_blank');
            }}
          >
            <HiLink />
          </Button>,
          <Button
            type="text"
            className="assist-action-item"
            onClick={() => {
              const newLinks = importResourceStore?.scrapeLinks?.filter((link) => {
                return link?.key !== item?.key;
              });

              importResourceStore.setScrapeLinks(newLinks);
            }}
          >
            <HiOutlineXMark strokeWidth={2} />
          </Button>,
        ]}
        className="intergation-result-list-item"
      >
        <List.Item.Meta
          avatar={<Avatar shape="square">{<img src={item?.image} style={{ objectFit: 'contain' }} />}</Avatar>}
          title={
            <div className="intergation-result-intro">
              <p>
                <span className="intergation-result-url" onClick={() => window.open(item?.url, '_blank')}>
                  {item?.url}
                </span>
              </p>
              <p>
                {item?.isError ? <span className="text-red-500">{t('resource.import.scrapeError')}</span> : item?.title}
              </p>
            </div>
          }
          description={item.description}
        />
      </List.Item>
    </Spin>
  );
};
