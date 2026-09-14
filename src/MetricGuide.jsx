import React from "react";
import { ChevronDown, CircleHelp } from "lucide-react";

export default function MetricGuide() {
  return (
    <details className="metric-guide">
      <summary><CircleHelp size={16} aria-hidden="true" /><span>집계 기준 가이드</span><ChevronDown className="guide-chevron" size={16} aria-hidden="true" /></summary>
      <div className="metric-guide-content">
        <h3>링크와 집계 대상</h3>
        <p><strong>연결 링크</strong>는 카드를 눌렀을 때 열리는 페이지입니다. <strong>집계 데이터베이스</strong>는 숫자를 계산할 원본 데이터베이스로, 연결 링크와 달라도 됩니다.</p>
        <p>일반 페이지나 대시보드 페이지 링크만으로는 집계할 수 없습니다. 다른 데이터베이스를 지정할 때는 원본 데이터베이스의 링크 또는 ID를 넣고, Notion에서 현재 연결에 공유해야 합니다.</p>
        <h3>표시할 숫자</h3>
        <dl>
          <dt>오늘 등록한 수</dt><dd>한국 시간 오늘 00:00부터 다음 날 00:00 전까지 생성된 기록입니다. 지정한 할일 날짜나 완료 여부와는 무관합니다.</dd>
          <dt>전체 기록 수</dt><dd>휴지통에 없는 전체 기록입니다. 완료된 항목도 포함합니다.</dd>
          <dt>날짜가 오늘인 수</dt><dd>지정한 날짜 속성의 시작 날짜가 한국 시간 오늘인 기록입니다. 생성 일시와 다르며, 날짜가 비어 있으면 제외합니다.</dd>
          <dt>미완료 수 / 완료 수</dt><dd>지정한 체크박스가 체크되지 않은 기록 / 체크된 기록입니다. 상태 속성은 아래의 ‘특정 선택·상태 값’을 사용합니다.</dd>
          <dt>특정 선택·상태 값의 수</dt><dd>선택·상태 속성이 지정한 값과 같은 기록입니다. 다중 선택이면 해당 값을 포함한 기록을 셉니다.</dd>
          <dt>숫자 표시 안 함</dt><dd>숫자를 숨깁니다. 연결 링크는 그대로 사용할 수 있습니다.</dd>
        </dl>
        <h3>속성 이름 예시</h3>
        <p><strong>명료화</strong>는 속성 이름이고 <strong>선택</strong>은 속성의 유형입니다. ‘선택·상태 속성 이름’에는 <strong>명료화</strong>, 값에는 <strong>다음행동</strong>처럼 실제 옵션 이름을 넣습니다.</p>
        <p>날짜 기준은 속성 이름 <strong>날짜</strong>, 미완료 기준은 체크박스 이름 <strong>완료</strong>처럼 데이터베이스에 적힌 이름을 정확히 사용합니다.</p>
        <h3>숫자가 다를 때</h3>
        <p>Notion 보기 링크의 필터는 자동으로 적용되지 않습니다. 집계에는 이 설정에서 고른 한 가지 기준만 적용됩니다. 앱 밖에서 직접 추가한 기록도 포함합니다.</p>
        <p><strong>0개</strong>는 조건에 맞는 기록이 없다는 뜻이고, <strong>조회 실패</strong>는 연결 권한·데이터베이스·속성 설정 등을 확인해야 한다는 뜻입니다.</p>
        <p>카드 이름은 직접 지정한 문구로 유지됩니다. 기준을 바꿨다면 이름도 그에 맞게 지정할 수 있습니다. 설정은 현재 기기·브라우저에 저장됩니다.</p>
      </div>
    </details>
  );
}
