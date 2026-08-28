'use client';

import { useState } from 'react';
import { readSettings } from '../../shared/storage';

export default function FloorplanPanel() {
  const settings = readSettings();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const configured = !!(settings.floorplanApiKey && settings.floorplanBase && settings.floorplanModel);

  const handleUpload = () => {
    if (!configured) return;
    setResult('调用模型中... （功能待接入）');
  };

  return (
    <div className="ad-floorplan">
      <h2>平面图重构</h2>
      <p className="ad-hint">上传场馆图片或视频，调用模型生成 JSON 平面图数据。生成结果不得覆盖已有分区定义。</p>

      {!configured ? (
        <div className="ad-unconfigured">
          <p>⚠ 未配置</p>
          <p>请在「系统设置」中填写 FLOORPLAN_API_KEY、BASE 和 MODEL。</p>
        </div>
      ) : (
        <>
          <div className="ad-upload-area">
            <input
              type="file"
              accept="image/*,video/*"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
            {file && <p>已选：{file.name}</p>}
            <button className="ad-add-btn" onClick={handleUpload} disabled={!file}>
              上传并重构
            </button>
          </div>
          {result && <pre className="ad-result">{result}</pre>}
        </>
      )}

      <div className="ad-floorplan-note">
        <p>注意：</p>
        <ul>
          <li>模型结果不得发明 T-A01 编号</li>
          <li>不得覆盖 214727 / 0816 分区表</li>
          <li>JSON 可下载，key 为空</li>
        </ul>
      </div>
    </div>
  );
}
