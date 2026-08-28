'use client';

import { readAdminData } from '../../shared/storage';

export default function InfoTab() {
  const data = readAdminData();
  const links = data.links;

  return (
    <div className="au-info">
      <h2 className="au-section-title">参观须知</h2>

      <section className="au-info-section">
        <h3>活动信息</h3>
        <p>She Nicest 千人烈变黑客松 · 大都｜科技创造节</p>
        <p>地点：北京市朝阳区天辰东路 5 号，国家会议中心二期 · 展厅 4</p>
        <p>观众开放日：8 月 27—29 日（免费预约观众日）；8 月 30 日（免费预约路演日）</p>
      </section>

      <section className="au-info-section">
        <h3>入场须知</h3>
        <ul>
          <li>均需本人有效凭证并接受安检</li>
          <li>8 月 27—29 日：扫码提交观众报名 → 进群 → 按通知预约 → 名单核验入场</li>
          <li>8 月 30 日路演日：免费预约制，票面 09:00—20:00</li>
          <li>未进入当日最终名单，不建议临时到场</li>
          <li>建议预留 20—30 分钟安检排队</li>
        </ul>
      </section>

      <section className="au-info-section">
        <h3>交通</h3>
        <p>地铁：8 号线 / 15 号线「奥林匹克公园站」F 口出站</p>
        <p>入口：导航到二期 3 号展馆对面两侧楼梯下 -1 层，或二期 2 号展馆对面扶梯下 -1 层</p>
        <p>驾车：国家会议中心不设停车场，可停北辰荟商场地下停车场</p>
      </section>

      <section className="au-info-section">
        <h3>展商区</h3>
        <p>8 月 28—29 日 10:00—18:30，凭凭证入内</p>
        <p>展位与动线可能更新，以现场导视为准</p>
      </section>

      <section className="au-info-section">
        <h3>8 月 30 日怎么看</h3>
        <ul>
          <li>09:30—12:30 初评与摆摊路演</li>
          <li>14:00 产品发布会</li>
          <li>14:50—16:50 终审路演</li>
          <li>17:40 起 颁奖典礼</li>
          <li>建议 09:30 完成入场</li>
        </ul>
      </section>

      <section className="au-info-section">
        <h3>集星兑奖（野人先生冰淇淋）</h3>
        <p>12:00—18:00 供应，每日数量有限，兑完即止</p>
        <ol>
          <li>领取星际航行卡</li>
          <li>完成展位/Workshop 互动，领取贴纸</li>
          <li>完成品牌任务：关注野人先生 + 小红书带 #野人先生 #SheNicest</li>
          <li>前往野人先生摊位核验兑换</li>
        </ol>
        <p>27—29 日：10 张有效贴纸，或集齐行星贴纸 + 1 张 Workshop 贴纸</p>
        <p>30 日：15 张选手贴纸</p>
        <p>每种方式每人限 1 次，不可代领</p>
      </section>

      <section className="au-info-section">
        <h3>禁入区域</h3>
        <p>不得进入选手 Coding 开发区、休息区、硬件借用区等非观众开放区域</p>
      </section>

      <section className="au-info-section">
        <h3>身份识别</h3>
        <ul>
          <li>洋红色胸牌：主创团队</li>
          <li>橙色胸牌：志愿者</li>
        </ul>
      </section>

      <section className="au-info-section">
        <h3>摄影挂绳</h3>
        <ul>
          <li>洋红色挂绳：愿意被拍摄</li>
          <li>黑色挂绳：不愿意被拍摄，后续发布需遮挡</li>
        </ul>
      </section>

      <section className="au-info-section">
        <h3>餐饮</h3>
        <p>场地衔接北辰萃商业街区，午餐 12:00—13:30、晚餐 18:00—19:30 错峰</p>
        <p>开发区及睡眠区内禁止用餐</p>
      </section>

      <section className="au-info-section">
        <h3>身体不适</h3>
        <p>医疗站位于场地中部，配有驻场医生、AED 和急救箱</p>
        <p>可就近找橙色胸牌志愿者或洋红色胸牌主创</p>
      </section>

      <section className="au-info-section">
        <h3>必带</h3>
        <p>入场凭证、有效证件、手机、充电宝、水杯、薄外套、雨具</p>
      </section>

      {links.length > 0 && (
        <section className="au-info-section">
          <h3>相关链接</h3>
          {links.map(l => (
            <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" className="au-link-card">
              {l.title}
            </a>
          ))}
        </section>
      )}

      <footer className="au-info-footer">
        <p>以现场导视为准 · 官网 shenicest.com</p>
      </footer>
    </div>
  );
}
