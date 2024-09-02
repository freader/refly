import { useState } from 'react';

// components
import { InvocationFormItems } from '@refly-packages/ai-workspace-common/components/skill/invocation-form-items';
import { TemplateConfigFormItems } from '@refly-packages/ai-workspace-common/components/skill/template-config-form-items';
import { useTranslation } from 'react-i18next';
// store
import getClient from '@refly-packages/ai-workspace-common/requests/proxiedRequest';

import { SkillInstance } from '@refly/openapi-schema';
import { Collapse, Modal, Form, Message, Button, FormInstance } from '@arco-design/web-react';

// styles
import './index.scss';

const CollapseItem = Collapse.Item;

const formItemLayout = {
  labelCol: {
    span: 4,
  },
  wrapperCol: {
    span: 20,
  },
};

interface InstanceInvokeProps {
  data: SkillInstance;
  setVisible: (val: boolean) => void;
  postConfirmCallback?: () => void;
  onOk?: () => void;
  form: FormInstance;
}

export const InstanceInvokeForm = (props: InstanceInvokeProps) => {
  const { data, setVisible, postConfirmCallback, form, onOk } = props;
  const { invocationConfig = {}, tplConfigSchema, tplConfig } = data ?? {};
  const { input, context } = invocationConfig;
  const { t } = useTranslation();
  const [confirmLoading, setConfirmLoading] = useState(false);

  return (
    <Form {...formItemLayout} form={form} className="instance-invoke-form-container">
      {input?.rules?.length > 0 && (
        <InvocationFormItems
          headerTitle={t('common.input')}
          ruleGroup={data?.invocationConfig.input}
          form={form}
          t={t}
          fieldPrefix="input"
        />
      )}

      {context?.rules?.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <InvocationFormItems
            headerTitle={t('common.context')}
            ruleGroup={data?.invocationConfig.context}
            form={form}
            t={t}
            fieldPrefix="context"
          />
        </div>
      )}

      {tplConfigSchema?.items?.length > 0 && (
        <TemplateConfigFormItems
          headerTitle={t('common.templateConfig')}
          schema={tplConfigSchema}
          form={form}
          tplConfig={tplConfig}
          fieldPrefix="tplConfig"
        />
      )}

      <div className="instance-invoke-modal-footer">
        <Button type="secondary" onClick={() => setVisible(false)}>
          {t('common.cancel')}
        </Button>
        <Button type="primary" onClick={onOk} style={{ marginLeft: 12 }} loading={confirmLoading}>
          {t('common.confirm')}
        </Button>
      </div>
    </Form>
  );
};
