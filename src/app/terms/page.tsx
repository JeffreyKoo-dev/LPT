import type { Metadata } from "next";
import { PageHeading } from "@/components/common/PageHeading";
import { Card } from "@/components/common/Card";
import { BUSINESS_INFO } from "@/data/businessInfo";

export const metadata: Metadata = {
  title: "이용약관",
  description: `${BUSINESS_INFO.serviceName} 이용약관`,
};

const EFFECTIVE_DATE = "2026-10-01";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <PageHeading
        label="Legal"
        title="이용약관"
        description={`시행일 ${EFFECTIVE_DATE}`}
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
            재화 및 콘텐츠 이용 권한은 소멸되며 환불되지 않습니다. 이용자가 타인의 정보를
            도용하거나 서비스 운영을 방해하는 등 이 약관을 위반한 경우, 회사는 이용계약을
            해지하거나 서비스 이용을 제한할 수 있습니다.
          </p>
        </Section>

        <Section title="제7조 (유료 콘텐츠 결제)">
          <ul className="list-disc pl-5">
            <li>보석 충전은 토스페이먼츠를 통해 결제되며, 결제 즉시 이용자의 계정에 보석이 반영됩니다.</li>
            <li>유료 콘텐츠는 보석 또는 (광고 시청으로 해제 가능하도록 지정된 콘텐츠에 한해) 별조각으로 결제할 수 있습니다.</li>
            <li>일부 콘텐츠(정밀 리포트, 운세 해석, 궁합 분석 등)는 AI를 통해 실시간 생성되며, 결제와 동시에 콘텐츠 생성이 개시됩니다.</li>
          </ul>
        </Section>

        <Section title="제8조 (청약철회 및 환불)">
          <p>
            이용자는 「전자상거래 등에서의 소비자보호에 관한 법률」에 따라 결제일로부터 7일
            이내에 청약철회(환불)를 요청할 수 있습니다. 다만 다음의 경우에는 관련 법령에 따라
            청약철회가 제한될 수 있습니다.
          </p>
          <ul className="list-disc pl-5">
            <li>이용자의 요청으로 콘텐츠 제공(AI 생성 등)이 이미 개시된 디지털 콘텐츠</li>
            <li>이미 사용(소비)한 보석·별조각에 해당하는 금액</li>
          </ul>
          <p>
            미사용 보석에 한해서는 결제일로부터 7일 이내 고객센터 문의를 통해 환불을 요청할
            수 있습니다. 카드사 결제취소(차지백) 등으로 결제가 사후에 취소되는 경우, 회사는
            해당 결제로 지급된 재화 중 미사용분을 회수하며, 이미 사용되어 회수할 수 없는
            금액이 있는 경우 별도로 확인 후 안내할 수 있습니다.
          </p>
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
            원만한 해결을 위해 성실히 협의합니다. 협의가 이루어지지 않는 경우, 민사소송법상의
            관할법원에 소를 제기할 수 있습니다.
          </p>
        </Section>

        <section className="border-t border-border pt-4 text-xs text-muted">
          <p>공고일자: {EFFECTIVE_DATE}</p>
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
