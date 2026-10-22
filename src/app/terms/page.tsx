import type { Metadata } from "next";
import { PageHeading } from "@/components/common/PageHeading";
import { Card } from "@/components/common/Card";
import Link from "next/link";
import { BUSINESS_INFO } from "@/data/businessInfo";
import { REFUND_POLICY } from "@/data/refundPolicy";

export const metadata: Metadata = {
  title: "이용약관",
  description: `${BUSINESS_INFO.serviceName} 이용약관`,
};

/** 현재 개정본: 2026-10-22 공고, 7일 뒤 시행. 직전 약관(2026-10-01 시행)은 시행일 전까지 적용된다. */
const ANNOUNCED_DATE = "2026-10-22";
const EFFECTIVE_DATE = "2026-10-29";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <PageHeading
        label="Legal"
        title="이용약관"
        description={`시행일 ${EFFECTIVE_DATE} (공고일 ${ANNOUNCED_DATE})`}
        align="left"
      />

      <Card variant="ledger" className="flex flex-col gap-6 text-sm leading-relaxed text-foreground">
        <Section title="제1조 (목적)">
          <p>
            이 약관은 {BUSINESS_INFO.companyName}(이하 &ldquo;회사&rdquo;)가 제공하는{" "}
            {BUSINESS_INFO.serviceName} 서비스(이하 &ldquo;서비스&rdquo;)의 이용과 관련하여
            회사와 이용자의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로
            합니다.
          </p>
        </Section>

        <Section title="제2조 (정의)">
          <ul className="list-disc pl-5">
            <li>&ldquo;서비스&rdquo;란 사주팔자와 성향 설문을 결합해 이용자의 라이프 패턴 유형(LPT)을 안내하고, 성장 퀘스트·뱃지·공유 등 부가 기능을 제공하는 웹 서비스를 말합니다.</li>
            <li>&ldquo;이용자&rdquo;란 이 약관에 따라 서비스를 이용하는 회원 및 비회원을 말합니다.</li>
            <li>&ldquo;유료 콘텐츠&rdquo;란 보석·별조각 등 서비스 내 재화를 사용해 이용할 수 있는 정밀 리포트, 운세 해석, 궁합 분석 등 콘텐츠를 말합니다.</li>
            <li>&ldquo;보석&rdquo;이란 실제 결제를 통해 충전하는 유료 재화를, &ldquo;별조각&rdquo;이란 웰컴·미션·광고 시청 등으로 적립되는 무상 재화를 말합니다.</li>
          </ul>
        </Section>

        <Section title="제3조 (서비스의 성격 및 면책)">
          <p>
            서비스가 제공하는 사주·운세·성향 분석 결과는 자기이해와 라이프 전략 수립을 돕기
            위한 참고 정보이며, 특정 사건의 발생이나 결과를 단정·보장하지 않습니다. 이용자는
            이 점을 이해하고 서비스를 참고 목적으로만 이용해야 하며, 서비스 콘텐츠를 근거로
            한 중요한 의사결정(진학·취업·투자·의료 등)의 결과에 대해 회사는 책임을 지지
            않습니다.
          </p>
        </Section>

        <Section title="제4조 (약관의 효력 및 변경)">
          <p>
            이 약관은 서비스 화면에 게시하거나 기타의 방법으로 공지함으로써 효력이 발생합니다.
            회사는 관련 법령을 위반하지 않는 범위에서 약관을 개정할 수 있으며, 개정 시 적용일자
            및 개정사유를 명시하여 적용일 7일 전부터 공지합니다. 다만 이용자에게 불리한 변경의
            경우 30일 전에 공지합니다.
          </p>
        </Section>

        <Section title="제5조 (이용계약의 체결)">
          <p>
            이용계약은 이용자가 약관 내용에 동의하고 이메일 인증 또는 카카오 소셜로그인을 통해
            회원가입을 신청하면, 회사가 이를 승낙함으로써 체결됩니다.
          </p>
        </Section>

        <Section title="제6조 (회원 탈퇴 및 자격 상실)">
          <p>
            이용자는 언제든지 서비스 내 &ldquo;내 계정&rdquo; 화면에서 탈퇴를 요청할 수 있으며,
            회사는 관련 법령이 정하는 경우를 제외하고 지체 없이 처리합니다. 탈퇴 시 보유
            재화 및 콘텐츠 이용 권한은 소멸됩니다. 다만 결제일로부터 {REFUND_POLICY.windowDays}일 이내의 미사용 보석은 탈퇴 전에
            제8조에 따라 환불을 요청할 수 있으며, 무상으로 지급된 별조각은 환불되지 않습니다. 이용자가 타인의 정보를
            도용하거나 서비스 운영을 방해하는 등 이 약관을 위반한 경우, 회사는 이용계약을
            해지하거나 서비스 이용을 제한할 수 있습니다.
          </p>
        </Section>

        <Section title="제7조 (유료 콘텐츠 결제)">
          <ul className="list-disc pl-5">
            <li>보석 충전은 토스페이먼츠를 통해 결제되며, 결제 즉시 이용자의 계정에 보석이 반영됩니다.</li>
            <li>유료 콘텐츠는 보석 또는 (광고 시청으로 해제 가능하도록 지정된 콘텐츠에 한해) 별조각으로 결제할 수 있습니다.</li>
            <li>일부 콘텐츠(정밀 리포트, 운세 해석, 궁합 분석 등)는 AI를 통해 실시간 생성되며, 결제와 동시에 콘텐츠 생성이 개시됩니다. 회사는 해당 콘텐츠의 &ldquo;열어보기&rdquo; 버튼 앞에서 콘텐츠 제공이 개시되면 청약철회가 제한된다는 점을 안내하고, 이용자의 확인을 받은 뒤에 결제를 진행합니다.</li>
            <li>보석 충전 금액에 따라 보너스 보석이 함께 지급될 수 있으며, 첫 결제에 한해 별조각 {REFUND_POLICY.firstChargeBonus}개가 추가로 지급될 수 있습니다.</li>
            <li>별조각은 무상으로 지급되는 재화로서 현금으로 환불되지 않으며, 회원 탈퇴 시 소멸합니다.</li>
          </ul>
        </Section>

        <Section title="제8조 (청약철회 및 환불)">
          <p>
            이용자는 「전자상거래 등에서의 소비자보호에 관한 법률」에 따라 결제일로부터{" "}
            {REFUND_POLICY.windowDays}일 이내에 청약철회(환불)를 요청할 수 있습니다.
          </p>
          <ul className="list-disc pl-5">
            <li>결제일로부터 {REFUND_POLICY.windowDays}일 이내이고 보석을 전혀 사용하지 않은 경우: 결제 금액 전액을 환불합니다. 이 경우 해당 결제로 지급된 보너스 보석과 첫 결제 보너스 별조각은 함께 회수됩니다.</li>
            <li>
              일부를 사용한 경우: 콘텐츠 제공이 개시된 부분(이미 사용한 보석)을 제외한 미사용분을
              환불합니다. 환불 금액은 &ldquo;실제 결제 금액 × 미사용 보석 ÷ 해당 결제로 지급된
              보석(보너스 포함)&rdquo;으로 계산하며, 원 단위 미만은 버립니다.
            </li>
            <li>결제일로부터 {REFUND_POLICY.windowDays}일이 지난 미사용 보석은 환불하지 않습니다. 다만 회사의 귀책사유가 있거나 관련 법령이 환불을 요구하는 경우에는 그에 따릅니다.</li>
            <li>이용자의 요청으로 AI 생성 등 콘텐츠 제공이 이미 개시된 디지털 콘텐츠는 관련 법령에 따라 해당 부분의 청약철회가 제한됩니다. 회사는 이 사실을 결제(열어보기) 전에 화면에 표시합니다.</li>
            <li>무상으로 지급된 별조각은 환불 대상이 아닙니다.</li>
          </ul>
          <p>
            콘텐츠의 내용이 표시·광고된 내용과 다르거나 계약 내용과 다르게 제공된 경우, 이용자는 콘텐츠를
            제공받은 날부터 3개월 이내, 그 사실을 안 날 또는 알 수 있었던 날부터 30일 이내에
            청약철회를 요청할 수 있으며, 앞의 제한 사유는 이 경우에 적용되지 않습니다.
          </p>
          <p>
            카드사 결제취소(차지백) 등으로 결제가 사후에 취소되는 경우, 회사는 해당 결제로 지급된
            재화(첫 결제 보너스 포함) 중 미사용분을 회수하며, 이미 사용되어 회수할 수 없는 금액이
            있는 경우 별도로 확인 후 안내할 수 있습니다.
          </p>
          <p>
            환불 기준의 쉬운 설명은 <Link href="/refund" className="underline underline-offset-2">환불 안내</Link>
            페이지에서 확인할 수 있습니다.
          </p>
        </Section>

        <Section title="제8조의2 (환불 절차)">
          <ul className="list-disc pl-5">
            <li>환불은 고객센터({BUSINESS_INFO.email ?? "이메일"}{BUSINESS_INFO.phone ? ` / ${BUSINESS_INFO.phone}` : ""})로 가입 계정, 결제일, 환불 사유를 알려 요청합니다.</li>
            <li>회사는 요청을 확인한 날부터 {REFUND_POLICY.processBusinessDays}영업일 이내에 결제 취소 또는 환급을 진행합니다. 카드 결제는 카드사에 따라 취소 반영까지 {REFUND_POLICY.cardExtraBusinessDays}영업일이 더 걸릴 수 있습니다.</li>
            <li>환불 수수료는 부과하지 않으며, 환불이 완료되면 해당 결제로 지급된 재화는 회수됩니다.</li>
          </ul>
        </Section>

        <Section title="제8조의3 (서비스 오류 및 미성년자 결제)">
          <ul className="list-disc pl-5">
            <li>AI 콘텐츠 생성이 오류로 완료되지 않은 경우 이용자는 같은 콘텐츠를 다시 생성할 수 있습니다. 반복되는 오류로 콘텐츠를 제공받지 못한 경우 이용자는 고객센터에 보석의 반환 또는 환불을 요청할 수 있으며, 회사는 확인 후 처리합니다.</li>
            <li>회사의 귀책사유로 유료 콘텐츠를 24시간 이상 이용하지 못한 경우, 이용자는 이용 불가 시간에 대해 보석 반환 또는 환불을 요청할 수 있습니다.</li>
            <li>미성년자가 법정대리인의 동의 없이 결제한 경우, 미성년자 본인 또는 법정대리인은 결제를 취소할 수 있습니다. 취소를 요청하는 경우 고객센터로 연락해 주세요.</li>
          </ul>
        </Section>

        <Section title="제9조 (서비스 이용의 제한 및 중단)">
          <p>
            회사는 시스템 점검, 설비 장애, 천재지변 등 불가피한 사유가 있는 경우 서비스
            제공을 일시적으로 중단할 수 있습니다. 이 경우 가능한 사전에 공지하며, 불가피한
            경우 사후에 공지할 수 있습니다.
          </p>
        </Section>

        <Section title="제10조 (지적재산권)">
          <p>
            서비스 내 콘텐츠(유형 설명, 캐릭터 일러스트, 퀘스트·뱃지 콘텐츠 등)에 대한
            저작권 및 지적재산권은 회사에 귀속됩니다. 이용자는 회사의 사전 동의 없이 이를
            복제, 송신, 배포, 2차 가공하여 영리 목적으로 이용할 수 없습니다.
          </p>
        </Section>

        <Section title="제11조 (분쟁해결 및 관할법원)">
          <p>
            이 약관과 관련하여 회사와 이용자 간 분쟁이 발생한 경우, 양 당사자는 분쟁의
            원만한 해결을 위해 성실히 협의합니다. 협의가 이루어지지 않는 경우, 이용자는 한국소비자원 등
            분쟁조정기관에 조정을 신청하거나 민사소송법상의 관할법원에 소를 제기할 수 있습니다.
          </p>
        </Section>

        <section className="border-t border-border pt-4 text-xs text-muted">
          <p>공고일자: {ANNOUNCED_DATE}</p>
          <p>시행일자: {EFFECTIVE_DATE}</p>
        </section>
      </Card>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 font-display text-base font-semibold text-foreground">{title}</h2>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  );
}
