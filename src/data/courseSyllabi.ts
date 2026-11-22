import type { CompetencyDomain, Course, CourseSyllabus } from '../types/index.ts';
import { DOMAIN_1_TO_3_SYLLABI } from './syllabi/domain1to3.ts';
import { DOMAIN_4_TO_6_SYLLABI } from './syllabi/domain4to6.ts';

export const COURSE_SYLLABI_BY_CODE: Record<string, CourseSyllabus> = {
  ...DOMAIN_1_TO_3_SYLLABI,
  ...DOMAIN_4_TO_6_SYLLABI,
};

export function getCourseSyllabus(course: Course): CourseSyllabus | undefined {
  return course.syllabus || COURSE_SYLLABI_BY_CODE[course.code];
}

export function generateCourseSyllabusMarkdown(
  course: Course,
  domain?: CompetencyDomain,
  language: 'vi' | 'en' = 'vi'
): string {
  const syllabus = getCourseSyllabus(course);
  const isVi = language === 'vi';
  const title = isVi ? course.titleVi : course.titleEn;
  const domainLabel = domain
    ? `${domain.code} — ${isVi ? domain.nameVi : domain.nameEn}`
    : course.category;

  const lines: string[] = [
    `# ${course.code}: ${title}`,
    '',
    `- **${isVi ? 'Miền năng lực' : 'Competency Domain'}**: ${domainLabel}`,
    `- **${isVi ? 'Cấp độ' : 'Level'}**: ${course.difficulty}`,
    `- **${isVi ? 'Thời lượng' : 'Duration'}**: ${course.durationHours} ${isVi ? 'giờ' : 'hours'}${
      syllabus
        ? ` (${isVi ? 'Giảng dạy & Lab' : 'Contact'}: ${syllabus.totalContactHours}h · ${
            isVi ? 'Tự học & OJT' : 'Self-Study'
          }: ${syllabus.totalSelfStudyHours}h)`
        : ''
    }`,
    `- **${isVi ? 'Giảng viên' : 'Faculty'}**: ${course.instructorName} — ${course.instructorTitle}`,
    `- **${isVi ? 'Điều kiện tiên quyết' : 'Prerequisites'}**: ${
      (isVi ? course.prerequisites : course.prerequisitesEn || course.prerequisites).length > 0
        ? (isVi ? course.prerequisites : course.prerequisitesEn || course.prerequisites).join(', ')
        : isVi
        ? 'Không yêu cầu'
        : 'None'
    }`,
    `- **${isVi ? 'Điểm đạt tối thiểu' : 'Passing Score'}**: ${course.passingScore}%`,
    '',
  ];

  if (syllabus) {
    lines.push(
      `## 1. ${isVi ? 'Tổng Quan & Đối Tượng Mục Tiêu' : 'Course Overview & Target Audience'}`,
      isVi ? syllabus.overviewVi : syllabus.overviewEn,
      '',
      `- **${isVi ? 'Đối tượng học viên' : 'Target Audience'}**: ${
        isVi ? syllabus.targetAudienceVi : syllabus.targetAudienceEn
      }`,
      `- **${isVi ? 'Lộ trình nghề nghiệp' : 'Career Progression'}**: ${
        isVi ? syllabus.careerTrackStageVi : syllabus.careerTrackStageEn
      }`,
      `- **${isVi ? 'Mã năng lực ánh xạ' : 'Mapped Competencies'}**: ${syllabus.competencyCodes.join(', ')}`,
      `- **${isVi ? 'Hình thức đào tạo' : 'Delivery Format'}**: ${
        isVi ? syllabus.deliveryFormatVi : syllabus.deliveryFormatEn
      }`,
      `- **${isVi ? 'Chuẩn bị trước khóa học (Pre-work)' : 'Pre-Work'}**: ${
        isVi ? syllabus.preWorkVi : syllabus.preWorkEn
      }`,
      '',
      `## 2. ${isVi ? 'Cấu Trúc Đánh Giá' : 'Assessment Breakdown'}`,
      `- ${isVi ? 'Bài thi kiến thức (Quiz)' : 'Knowledge Exam (Quiz)'}: **${syllabus.assessmentBreakdown.quizWeight}%**`,
      `- ${isVi ? 'Nghiên cứu tình huống (Case Study)' : 'Case Study Analysis'}: **${syllabus.assessmentBreakdown.caseStudyWeight}%**`,
      `- ${isVi ? 'Thực hành tại khách sạn (OJT)' : 'On-the-Job Practical (OJT)'}: **${syllabus.assessmentBreakdown.practicalOjtWeight}%**`,
      `- ${isVi ? 'Chuẩn đạt khóa học' : 'Minimum Passing Threshold'}: **${syllabus.assessmentBreakdown.passingScore}%**`,
      ''
    );
  }

  lines.push(`## 3. ${isVi ? 'Mục Tiêu Học Tập' : 'Learning Objectives'}`);
  const objs = isVi ? course.learningObjectivesVi : course.learningObjectivesEn;
  objs.forEach((o, i) => lines.push(`${i + 1}. ${o}`));
  lines.push('');

  if (syllabus) {
    lines.push(`## 4. ${isVi ? 'Đề Cương Chi Tiết Từng Học Phần' : 'Detailed Session-by-Session Syllabus'}`);
    syllabus.sessions.forEach((s) => {
      lines.push(
        '',
        `### ${isVi ? s.titleVi : s.titleEn} (${s.durationHours}h · ${s.format})`,
        `**${isVi ? 'Chuẩn đầu ra' : 'Learning Outcomes'}:**`
      );
      (isVi ? s.learningOutcomesVi : s.learningOutcomesEn).forEach((lo) => lines.push(`- ${lo}`));
      lines.push(`**${isVi ? 'Nội dung chính' : 'Key Topics'}:**`);
      (isVi ? s.topicsVi : s.topicsEn).forEach((tp) => lines.push(`- ${tp}`));
      if (s.keyStandardsAndFormulas.length > 0) {
        lines.push(`**${isVi ? 'Chuẩn mực & Công thức trọng tâm' : 'Standards & Formulas'}:**`);
        s.keyStandardsAndFormulas.forEach((f) => lines.push(`- \`${f}\``));
      }
      lines.push(
        `**${isVi ? 'Bài thực hành Excel / Lab' : 'Practical Lab'}:** ${
          isVi ? s.practicalLabVi : s.practicalLabEn
        }`,
        `**${isVi ? 'Sản phẩm đầu ra' : 'Deliverables'}:** ${(isVi
          ? s.deliverablesVi
          : s.deliverablesEn
        ).join('; ')}`
      );
    });

    lines.push(
      '',
      `## 5. ${isVi ? 'Sản Phẩm Tốt Nghiệp & Tài Liệu Tham Khảo' : 'Capstone Deliverable & References'}`,
      `- **Capstone**: ${isVi ? syllabus.capstoneDeliverableVi : syllabus.capstoneDeliverableEn}`,
      ...(course.practicalAssignmentTitle
        ? [
            `- **OJT Project**: ${
              isVi
                ? course.practicalAssignmentTitle
                : course.practicalAssignmentTitleEn || course.practicalAssignmentTitle
            }`,
          ]
        : []),
      ...syllabus.referencesAndStandards.map((r) => `- ${r}`),
      ''
    );
  }

  return lines.join('\n');
}

export function generateMasterSyllabusMarkdown(
  courses: Course[],
  domains: CompetencyDomain[],
  language: 'vi' | 'en' = 'vi'
): string {
  const isVi = language === 'vi';
  const totalHours = courses.reduce((sum, c) => sum + Number(c.durationHours || 0), 0);
  const header: string[] = [
    `# FC LEARNING ACADEMY — ${
      isVi
        ? 'ĐỀ CƯƠNG ĐÀO TẠO CHI TIẾT 18 KHÓA HỌC & 6 MIỀN NĂNG LỰC'
        : 'MASTER CURRICULUM SYLLABUS (6 DOMAINS · 18 COURSES)'
    }`,
    '',
    `- **${isVi ? 'Tổng số miền năng lực' : 'Total Competency Domains'}**: ${domains.length}`,
    `- **${isVi ? 'Tổng số khóa học' : 'Total Courses'}**: ${courses.length}`,
    `- **${isVi ? 'Tổng thời lượng đào tạo' : 'Total Training Hours'}**: ${totalHours} ${
      isVi ? 'giờ' : 'hours'
    }`,
    `- **${isVi ? 'Tiêu chuẩn tham chiếu' : 'Standards'}**: USALI 11th & 12th Editions · IFRS 15 / IFRS 9 / IAS 16 · STR Benchmarking`,
    '',
    '---',
    '',
  ];

  const sections: string[] = [];
  domains.forEach((dom) => {
    const domCourses = courses
      .filter((c) => c.domainId === dom.id)
      .sort((a, b) => a.code.localeCompare(b.code));
    const domHours = domCourses.reduce((s, c) => s + c.durationHours, 0);
    sections.push(
      `# ${dom.code}: ${isVi ? dom.nameVi : dom.nameEn} (${domCourses.length} ${
        isVi ? 'khóa' : 'courses'
      } · ${domHours}h)`,
      '',
      isVi ? dom.descriptionVi : dom.descriptionEn,
      ''
    );
    domCourses.forEach((course) => {
      sections.push(generateCourseSyllabusMarkdown(course, dom, language));
      sections.push('---', '');
    });
  });

  return [...header, ...sections].join('\n');
}
