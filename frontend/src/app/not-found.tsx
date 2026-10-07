import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";

export default function NotFound() {
  return (
    <div className="shell py-12">
      <EmptyState title="Không tìm thấy trang này" action={<Link href="/" className="inline-flex h-11 items-center rounded-lg bg-ink-600 px-5 text-[15px] font-semibold text-white hover:bg-ink-700">Về trang chủ</Link>}>
        Đường dẫn có thể đã đổi hoặc gõ chưa đúng. Thử tìm sản phẩm bằng ô tìm kiếm phía trên.
      </EmptyState>
    </div>
  );
}
