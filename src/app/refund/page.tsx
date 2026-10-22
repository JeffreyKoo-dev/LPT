import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/common/PageHeading";
import { Card } from "@/components/common/Card";
import { BUSINESS_INFO } from "@/data/businessInfo";
import { REFUND_POLICY } from "@/data/refundPolicy";

export const metadata: Metadata = {
  title: "환불 안내",
  description: "보석·별조각과 유료 콘텐츠의 청약철회·환불 기준, 신청 방법, 처리 기간을 쉬운 말로 안내합니다.",
};

export default function RefundPage() {
  const contact = [BUSINESS_INFO.email, BUSINESS_INFO.phone].filter(Boolean).join(" / ");

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <PageHeading
        label="Legal"
        title="환불 안내"
        description="이용약관 제8조 계열의 내용을 쉬운 말로 정리했어요. 약관과 다를 때는 약관이 우선합니다."
        align="left"
      />

      <Card variant="ledger" className="flex flex-col gap-6 text-sm leading-relaxed">
        <Block title="환불 기준 한눈에 보기">
          <ul className="list-disc pl-5">
            <li>
              <b>결제 후 {REFUND_POLICY.windowDays}일 이내 + 보석을 하나도 쓰지 않았다면</b> 결제 금액 전액을 환불해
              드려요.
            </li>
            <li>
              <b>일부를 썼다면</b> 이미 열어본(콘텐츠 제공이 시작된) 만큼은 제외하고, 쓰지 않은 부분을
              환불해 드려요.
            </li>
            <li>
              <b>{REFUND_POLICY.windowDays}일이 지난 미사용 보석</b>은 환불되지 않아요. 다만 서비스 오류처럼
              회사 책임이 있거나 법령이 환불을 요구하는 경우에는 예외예요.
            </li>
            <li>
              <b>별조각</b>(미션·광고 시청·가입 등으로 받는 무료 재화)은 환불되지 않아요.
            </li>
          </ul>
        </Block>

        <Block title="일부 사용했을 때 환불 금액 계산">
          <p>
            <b>실제 결제 금액 × (미사용 보석 ÷ 그 결제로 받은 보석 전체)</b>으로 계산하고, 원 단위
            미만은 버려요. 보너스로 받은 보석도 &lsquo;받은 보석 전체&rsquo;에 포함돼요.
          </p>
          <p className="text-muted">
            예) 10,000원을 결제해 보석 12,000개를 받았고 3,000개를 썼다면, 10,000원 × 9,000 ÷ 12,000 =
            7,500원을 환불해요.
          </p>
        </Block>

        <Block title="열어보기 전에 꼭 확인해 주세요">
          <p>
            정밀 리포트·운세·궁합처럼 AI가 바로 만들어 주는 콘텐츠는 &lsquo;열어보기&rsquo;를 누르는 순간 보석이
            차감되고 생성이 시작돼요. 콘텐츠 제공이 시작된 부분은 법령에 따라 청약철회가 제한될 수 있어요.
            그래서 버튼을 누르기 전에 한 번 더 확인하는 단계를 두었어요.
          </p>
        </Block>

        <Block title="첫 결제 보너스와 환불">
          <p>
            첫 결제 때 받는 별조각 {REFUND_POLICY.firstChargeBonus}개는 해당 결제를 환불하거나 결제가 취소되면
            남아 있는 만큼 함께 회수돼요.
          </p>
        </Block>

        <Block title="회사 책임으로 이용하지 못했을 때">
          <ul className="list-disc pl-5">
            <li>AI 콘텐츠 생성이 오류로 끝나지 않았다면 다시 생성할 수 있어요.</li>
            <li>반복되는 오류나 24시간 이상의 이용 불가가 있었다면 보석 반환 또는 환불을 요청해 주세요.</li>
            <li>
              콘텐츠가 안내·광고된 내용과 다르게 제공됐다면, 제공받은 날부터 3개월 이내 또는 알게 된 날부터
              30일 이내에 청약철회를 요청할 수 있어요.
            </li>
          </ul>
        </Block>

        <Block title="미성년자 결제">
          <p>
            법정대리인의 동의 없이 미성년자가 결제한 경우, 본인 또는 법정대리인이 결제를 취소할 수 있어요.
            고객센터로 연락해 주세요.
          </p>
        </Block>

        <Block title="환불 신청 방법과 처리 기간">
          <ul className="list-disc pl-5">
            <li>
              고객센터({contact || "준비 중"})로 가입 계정, 결제일, 환불 사유를 보내 주세요.
            </li>
            <li>
              요청을 확인한 날부터 {REFUND_POLICY.processBusinessDays}영업일 이내에 결제 취소 또는 환급을 진행해요.
              카드 결제는 카드사에 따라 취소 반영까지 {REFUND_POLICY.cardExtraBusinessDays}영업일이 더 걸릴 수 있어요.
            </li>
            <li>환불 수수료는 없어요. 환불이 끝나면 그 결제로 받은 재화는 회수돼요.</li>
          </ul>
        </Block>

        <Block title="분쟁이 생겼을 때">
          <p>
            회사와 해결되지 않으면 한국소비자원 등 분쟁조정기관에 조정을 신청할 수 있어요. 자세한 내용은{" "}
            <Link href="/terms" className="underline underline-offset-2">이용약관</Link>을 확인해 주세요.
          </p>
        </Block>
      </Card>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 font-display text-base font-semibold text-foreground">{title}</h2>
      <div className="flex flex-col gap-2 break-keep text-sm leading-relaxed text-muted">{children}</div>
    </section>
  );
}
