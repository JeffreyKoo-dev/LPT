import type { Metadata } from "next";
import { PageHeading } from "@/components/common/PageHeading";
import { Card } from "@/components/common/Card";
import { BUSINESS_INFO } from "@/data/businessInfo";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: `${BUSINESS_INFO.serviceName} 개인정보처리방침`,
};

const EFFECTIVE_DATE = "2026-10-01";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <PageHeading
        label="Legal"
        title="개인정보처리방침"
        description={`시행일 ${EFFECTIVE_DATE}`}
        align="left"
      />

      <Card variant="ledger" className="prose-sm flex flex-col gap-6 text-sm leading-relaxed text-foreground">
        <section>
          <p>
            {BUSINESS_INFO.companyName}(이하 &ldquo;회사&rdquo;)는 {BUSINESS_INFO.serviceName}
            (이하 &ldquo;서비스&rdquo;)를 운영하며, 「개인정보보호법」 등 관련 법령을 준수하여
            이용자의 개인정보를 보호하고 있습니다. 회사는 본 개인정보처리방침을 통해 이용자가
            제공하는 개인정보가 어떤 목적과 방식으로 이용되며, 개인정보 보호를 위해 어떤
            조치가 취해지고 있는지 안내합니다.
          </p>
        </section>

        <Section title="1. 수집하는 개인정보 항목 및 수집 방법">
          <p className="font-medium text-foreground">가. 회원가입 및 로그인</p>
          <ul className="list-disc pl-5">
            <li>이메일 로그인: 이메일 주소(인증코드 발송 및 본인 확인)</li>
            <li>카카오 소셜로그인: 닉네임(필수), 이메일(필수), 프로필 사진(선택) — 카카오로부터 제공받음</li>
          </ul>

          <p className="mt-3 font-medium text-foreground">나. 서비스 이용 과정에서 수집하는 정보</p>
          <ul className="list-disc pl-5">
            <li>생년월일, 출생시간, 성별 — 사주팔자 및 유형 산출을 위해 이용자가 직접 입력</li>
            <li>성향 설문 응답(36문항)</li>
            <li>닉네임, 서비스 이용 기록(퀘스트 완료·레벨·뱃지·성장 히스토리 등)</li>
            <li>친구초대·추천 관계 정보(초대 코드, 친구 목록)</li>
          </ul>

          <p className="mt-3 font-medium text-foreground">다. 결제 관련 정보</p>
          <ul className="list-disc pl-5">
            <li>
              결제는 토스페이먼츠(PG사)를 통해 처리되며, 카드번호·계좌정보 등 결제수단 정보는
              회사가 직접 수집·저장하지 않고 토스페이먼츠가 처리합니다. 회사는 결제 결과
              (결제금액, 결제수단 종류, 결제일시, 승인번호)만 전달받아 보유합니다.
            </li>
            <li>서비스 내 재화(보석·별조각) 충전·사용·환불 내역</li>
          </ul>

          <p className="mt-3 font-medium text-foreground">라. 자동으로 수집되는 정보</p>
          <ul className="list-disc pl-5">
            <li>접속 로그, 서비스 이용 기록, 쿠키, 접속 IP(부정 이용 방지·서비스 운영 목적)</li>
            <li>
              비회원 상태에서 입력한 기본정보·설문 응답은 이용자 브라우저의 로컬 저장소
              (LocalStorage)에만 저장되며, 회원 전환 시에만 서버로 이전됩니다.
            </li>
          </ul>

          <p className="mt-3 font-medium text-foreground">마. 선택적으로 수집하는 정보</p>
          <ul className="list-disc pl-5">
            <li>
              &ldquo;익명 통계 목적 제공&rdquo;에 별도로 동의한 경우에 한해, 계정과 연결되지 않는
              별도 저장소에 생년월일시·성별·산출된 유형만 저장됩니다. 닉네임이나 계정 식별
              정보는 포함되지 않으며, 동의하지 않아도 서비스 이용에 제한이 없습니다.
            </li>
          </ul>
        </Section>

        <Section title="2. 개인정보의 수집 및 이용 목적">
          <ul className="list-disc pl-5">
            <li>회원 식별, 가입 의사 확인, 본인 확인, 부정 이용 방지</li>
            <li>사주팔자·성향 분석 결과(LPT 유형) 산출 및 맞춤 콘텐츠 제공</li>
            <li>유료 콘텐츠 결제·환불 처리 및 거래 기록 보관</li>
            <li>친구초대·추천 보상 등 부가 서비스 제공</li>
            <li>공지사항 전달, 민원 처리, 서비스 개선을 위한 통계 분석</li>
          </ul>
        </Section>

        <Section title="3. 개인정보의 보유 및 이용 기간">
          <p>
            회사는 원칙적으로 개인정보 수집·이용 목적이 달성되면 지체 없이 해당 정보를
            파기합니다. 다만 아래의 경우 명시한 기간 동안 보존합니다.
          </p>
          <ul className="list-disc pl-5">
            <li>회원 탈퇴 시: 즉시 파기(단, 아래 법령에 따른 보존 의무가 있는 정보는 예외)</li>
            <li>
              「전자상거래 등에서의 소비자보호에 관한 법률」에 따른 보존: 계약 또는 청약철회
              등에 관한 기록 5년, 대금결제 및 재화 공급에 관한 기록 5년, 소비자 불만 또는
              분쟁처리에 관한 기록 3년
            </li>
            <li>「통신비밀보호법」에 따른 로그인 기록 보존: 3개월</li>
          </ul>
        </Section>

        <Section title="4. 개인정보의 제3자 제공">
          <p>
            회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만 아래의 경우는
            예외로 합니다.
          </p>
          <ul className="list-disc pl-5">
            <li>이용자가 사전에 별도로 동의한 경우</li>
            <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
          </ul>
        </Section>

        <Section title="5. 개인정보 처리의 위탁">
          <p>회사는 서비스 운영을 위해 아래와 같이 개인정보 처리를 위탁하고 있습니다.</p>
          <ul className="list-disc pl-5">
            <li>Supabase, Inc. — 데이터베이스 운영, 회원 인증(로그인) 처리</li>
            <li>Amazon Web Services — 애플리케이션 서버 호스팅(서울 리전)</li>
            <li>토스페이먼츠(주) — 결제(PG) 처리</li>
            <li>카카오(주) — 카카오 소셜로그인, 카카오톡 공유 기능</li>
            <li>
              Anthropic, PBC — 유료 프리미엄 콘텐츠(정밀 리포트, 운세 해석 등) 생성을 위한
              AI 모델 호출. 콘텐츠 생성에 필요한 최소한의 사주 계산 결과만 전달되며, 생년월일·
              이름 등 직접 식별 정보는 전달되지 않습니다.
            </li>
          </ul>
        </Section>

        <Section title="6. 이용자의 권리와 행사 방법">
          <ul className="list-disc pl-5">
            <li>이용자는 언제든지 서비스 내 &ldquo;내 계정&rdquo; 화면에서 본인의 개인정보를 조회·수정할 수 있습니다.</li>
            <li>회원 탈퇴를 통해 개인정보 삭제를 요청할 수 있습니다.</li>
            <li>그 밖에 개인정보 열람·정정·삭제·처리정지를 요청하려면 아래 문의처로 연락해주시기 바랍니다.</li>
          </ul>
        </Section>

        <Section title="7. 개인정보의 파기 절차 및 방법">
          <p>
            회사는 개인정보 보유 기간이 경과하거나 처리 목적이 달성된 경우 지체 없이 해당
            개인정보를 파기합니다. 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적
            방법을 사용하여 삭제합니다.
          </p>
        </Section>

        <Section title="8. 쿠키의 운영 및 거부">
          <p>
            회사는 이용자에게 맞춤화된 서비스를 제공하기 위해 로그인 세션 유지 등의 목적으로
            쿠키 및 브라우저 로컬 저장소를 사용합니다. 이용자는 브라우저 설정을 통해 쿠키
            저장을 거부할 수 있으나, 이 경우 로그인이 필요한 일부 서비스 이용에 어려움이
            있을 수 있습니다.
          </p>
        </Section>

        <Section title="9. 개인정보 보호책임자">
          <p>
            회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한
            이용자의 불만 처리 및 피해 구제 등을 위하여 아래와 같이 개인정보 보호책임자를
            지정하고 있습니다.
          </p>
          <ul className="list-disc pl-5">
            <li>성명: {BUSINESS_INFO.ceoName}</li>
            <li>연락처: {BUSINESS_INFO.email ?? BUSINESS_INFO.phone ?? "준비 중 — 추후 업데이트 예정"}</li>
          </ul>
        </Section>

        <Section title="10. 개인정보처리방침의 변경">
          <p>
            본 방침은 법령·정책 또는 서비스 내용 변경에 따라 수정될 수 있으며, 변경 시 서비스
            내 공지사항(또는 본 페이지)을 통해 사전에 고지합니다.
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
