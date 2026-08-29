import { redirect } from "next/navigation";

// 预约与访客名单已合并到 /appointments，这里重定向以兼容旧入口。
export default function LeadsRedirect() {
  redirect("/appointments");
}
