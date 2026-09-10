import { Editor } from '@bytemd/react';
import gfm from '@bytemd/plugin-gfm';
import highlight from '@bytemd/plugin-highlight';
import math from '@bytemd/plugin-math';
import breaks from '@bytemd/plugin-breaks';

import 'bytemd/dist/index.css';
import 'highlight.js/styles/github.css';
import 'katex/dist/katex.min.css';

const plugins = [gfm(), highlight(), math(), breaks()];

interface Props {
  value: string;
  onChange: (v: string) => void;
  uploadImages: (files: File[]) => Promise<{ url: string; alt: string }[]>;
}

export function MdEditor({ value, onChange, uploadImages }: Props) {
  return (
    <div className="md-editor">
      <Editor
        value={value}
        plugins={plugins}
        mode="split"
        placeholder="开始写作… 支持拖拽 / 粘贴图片上传"
        onChange={onChange}
        uploadImages={uploadImages}
      />
    </div>
  );
}
