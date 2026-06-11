from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser

from .models import University, Program, Application
from .serializers import (
    UniversitySerializer, UniversityListSerializer,
    ProgramSerializer, ApplicationSerializer, ExcelUploadSerializer,
)

# ── Excel column → Program model field mapping ────────────────────────────────
# 'University' and 'Degree' are handled separately in the import logic.
EXCEL_COLUMN_MAP = {
    'reason':                                                            'reason',
    'course':                                                            'name',
    'Application deadline':                                              'application_deadline',
    'application deadline 2':                                            'application_deadline_2',
    'portal':                                                            'portal',
    'Submit application to':                                             'application_submission_info',
    'URL':                                                               'program_url',
    'Course location':                                                   'course_location',
    'Teaching language':                                                 'teaching_language',
    'Languages':                                                         'languages_description',
    'Programme duration':                                                'duration_text',
    'Beginning':                                                         'beginning',
    'Description/content':                                               'description',
    'Course organisation':                                               'course_organisation',
    'International elements':                                            'international_elements',
    'Course-specific, integrated German language courses':               'integrated_german_courses',
    'Course-specific, integrated English language courses':              'integrated_english_courses',
    'Semester contribution':                                             'semester_contribution',
    'Costs of living':                                                   'costs_of_living',
    'Funding opportunities within the university':                       'funding_available',
    'Description of the above-mentioned funding opportunities within the university': 'funding_description',
    'Academic admission requirements':                                   'academic_requirements',
    'Language requirements':                                             'language_requirements',
    'Possibility of finding part-time employment':                       'part_time_employment',
    'Accommodation':                                                     'accommodation_info',
    'Career advisory services and programmes for future professionals':  'career_services',
    'Support for international students and doctoral candidates':        'international_support',
    'Full-time / part-time':                                             'study_mode',
    'Integrated internships':                                            'integrated_internships',
    'Supervisor-student ratio':                                          'supervisor_student_ratio',
    'Additional information on beginning, duration and mode of study':   'additional_study_info',
    'General services and support for international students and doctoral candidates': 'general_services',
    'Integrated/optional study abroad unit(s)':                         'study_abroad',
    'Current information':                                               'current_information',
    'Description of other international elements':                       'other_international_elements',
    'In cooperation with':                                               'in_cooperation_with',
    'Diverse intercultural background of students':                      'diverse_background',
    'Special promotion / funding of the programme':                      'special_funding',
    'Mode of study':                                                     'mode_of_study',
    'Name of DAAD funding programme':                                    'daad_funding_programme',
    'Pace of course':                                                    'pace_of_course',
    'Phase(s) of attendance in Germany (applies to the entire programme)': 'attendance_phases_in_germany',
    'Technical equipment and programmes':                                'technical_equipment',
    'Certificates for specific modules are awarded':                     'certificates_for_modules',
    'Additional information on tuition fees':                            'additional_tuition_info',
}


def _map_degree_type(raw):
    """Map a free-text degree label to one of the Program.DEGREE_TYPE_CHOICES keys."""
    if not raw:
        return 'other'
    lower = raw.lower()
    if 'master' in lower or 'm.sc' in lower or 'msc' in lower:
        return 'masters'
    if 'bachelor' in lower or 'b.sc' in lower or 'bsc' in lower:
        return 'bachelors'
    if 'phd' in lower or 'doctor' in lower:
        return 'phd'
    if 'diploma' in lower:
        return 'diploma'
    if 'certificate' in lower:
        return 'certificate'
    return 'other'


def _clean(value):
    """Return a stripped string or empty string for None values."""
    if value is None:
        return ''
    text = str(value).strip()
    # DAAD appends a JS-stripped suffix on some URL-like fields
    return text.replace('DAADREMOVE_JS', '').strip()


# ── ViewSets ──────────────────────────────────────────────────────────────────

class UniversityViewSet(viewsets.ModelViewSet):
    queryset = University.objects.all()
    serializer_class = UniversitySerializer

    def get_serializer_class(self):
        if self.action == 'list':
            return UniversityListSerializer
        return UniversitySerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [AllowAny()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_queryset(self):
        queryset = University.objects.filter(is_active=True)

        country = self.request.query_params.get('country')
        if country:
            queryset = queryset.filter(country__icontains=country)

        city = self.request.query_params.get('city')
        if city:
            queryset = queryset.filter(city__icontains=city)

        university_type = self.request.query_params.get('type')
        if university_type:
            queryset = queryset.filter(university_type=university_type)

        scholarships = self.request.query_params.get('scholarships')
        if scholarships == 'true':
            queryset = queryset.filter(scholarships_available=True)

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(name__icontains=search)

        ordering = self.request.query_params.get('ordering', 'name')
        if ordering:
            queryset = queryset.order_by(ordering)

        return queryset


class ApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Application.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ProgramViewSet(viewsets.ModelViewSet):
    queryset = Program.objects.all()
    serializer_class = ProgramSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [AllowAny()]

    def get_queryset(self):
        queryset = Program.objects.filter(is_active=True)

        university_id = self.request.query_params.get('university')
        if university_id:
            queryset = queryset.filter(university_id=university_id)

        degree_type = self.request.query_params.get('degree_type')
        if degree_type:
            queryset = queryset.filter(degree_type=degree_type)

        return queryset


# ── Function-based views ──────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    user = request.user
    applied_count = Application.objects.filter(user=user).count()
    added_count = University.objects.filter(created_by=user).count() if user.is_staff else 0
    recent_applications = Application.objects.filter(user=user)[:5]
    return Response({
        'applied_count': applied_count,
        'added_count': added_count,
        'recent_applications': ApplicationSerializer(recent_applications, many=True).data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def apply_to_university(request):
    university_id = request.data.get('university_id')
    if not university_id:
        return Response({'error': 'University ID is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        university = University.objects.get(pk=university_id, is_active=True)
    except University.DoesNotExist:
        return Response({'error': 'University not found'}, status=status.HTTP_404_NOT_FOUND)

    if Application.objects.filter(user=request.user, university=university).exists():
        return Response({'error': 'You have already applied to this university'}, status=status.HTTP_400_BAD_REQUEST)

    application = Application.objects.create(user=request.user, university=university, status='pending')
    return Response(ApplicationSerializer(application).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_applications(request):
    applications = Application.objects.filter(user=request.user)
    return Response(ApplicationSerializer(applications, many=True).data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def withdraw_application(request, pk):
    try:
        application = Application.objects.get(pk=pk, user=request.user)
        application.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except Application.DoesNotExist:
        return Response({'error': 'Application not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([AllowAny])
def university_detail(request, pk):
    try:
        university = University.objects.get(pk=pk, is_active=True)
        return Response(UniversitySerializer(university).data)
    except University.DoesNotExist:
        return Response({'error': 'University not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_universities(request):
    if not request.user.is_staff:
        return Response({'error': 'You do not have permission to view this'}, status=status.HTTP_403_FORBIDDEN)
    universities = University.objects.filter(created_by=request.user)
    return Response(UniversityListSerializer(universities, many=True).data)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def download_template(request):
    """Return a pre-formatted .xlsx template file showing all required columns."""
    try:
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment
        from io import BytesIO
    except ImportError:
        return Response({'error': 'openpyxl is not installed.'}, status=500)

    from django.http import HttpResponse

    HEADERS = [
        'University',
        'Degree',
        'reason',
        'course',
        'Application deadline',
        'application deadline 2',
        'portal',
        'Submit application to',
        'URL',
        'Course location',
        'Teaching language',
        'Languages',
        'Programme duration',
        'Beginning',
        'Description/content',
        'Course organisation',
        'International elements',
        'Course-specific, integrated German language courses',
        'Course-specific, integrated English language courses',
        'Semester contribution',
        'Costs of living',
        'Funding opportunities within the university',
        'Description of the above-mentioned funding opportunities within the university',
        'Academic admission requirements',
        'Language requirements',
        'Possibility of finding part-time employment',
        'Accommodation',
        'Career advisory services and programmes for future professionals',
        'Support for international students and doctoral candidates',
        'Full-time / part-time',
        'Integrated internships',
        'Supervisor-student ratio',
        'Additional information on beginning, duration and mode of study',
        'General services and support for international students and doctoral candidates',
        'Integrated/optional study abroad unit(s)',
        'Current information',
        'Description of other international elements',
        'In cooperation with',
        'Diverse intercultural background of students',
        'Special promotion / funding of the programme',
        'Mode of study',
        'Name of DAAD funding programme',
        'Pace of course',
        'Phase(s) of attendance in Germany (applies to the entire programme)',
        'Technical equipment and programmes',
        'Certificates for specific modules are awarded',
        'Additional information on tuition fees',
    ]

    SAMPLE = [
        'Technical University of Munich',
        'Master of Science',
        'Research excellence, strong industry connections',
        'Computer Science M.Sc.',
        '15.01.2025',
        '15.07.2025',
        'https://portal.tum.de',
        'TUM Online Application Portal',
        'https://www.tum.de/cs',
        'Munich',
        'English',
        'English (B2), German optional',
        '2 years (4 semesters)',
        'Winter semester (October)',
        'The M.Sc. Computer Science covers core and advanced topics in algorithms, AI and systems.',
        'Lectures, seminars, practical lab sessions, thesis project',
        'Exchange programmes with 200+ international partner universities',
        'Yes',
        'Yes',
        '149 EUR per semester',
        '800–1000 EUR/month',
        'Yes',
        'DAAD and TUM Excellence Fund scholarships available',
        'Bachelor degree (min. 180 ECTS) in CS or closely related field',
        'IELTS 6.5 or TOEFL iBT 88',
        'Yes, up to 20 hours/week permitted',
        'Student dormitories available — apply early via Studentenwerk München',
        'Annual career fair, internship placement support',
        'International Student Office, language courses, buddy programme',
        'Full-time',
        'Optional internship semester available in Semester 3',
        '1:20',
        'Standard 4-semester full-time programme',
        'Exchange opportunities at MIT, ETH Zurich and other top institutions',
        'Yes — optional semester abroad at a partner university',
        '',
        '',
        '',
        'Students from over 100 countries',
        'TUM Global Excellence Initiative',
        'Full-time',
        'DAAD University Partnerships',
        'Standard',
        '',
        'Licensed software suite, GPU compute clusters, cloud credits',
        'Yes',
        'No additional tuition fees beyond the semester contribution',
    ]

    COLUMN_REF = [
        ('University',     'Full official name of the university',              True),
        ('Degree',         'Degree type, e.g. "Master of Science"',            True),
        ('course',         'Full programme / course name',                      True),
        ('Application deadline', 'Primary application deadline (DD.MM.YYYY)', True),
        ('application deadline 2', 'Second/rolling deadline (DD.MM.YYYY)',    False),
        ('reason',         'Why the programme stands out',                     False),
        ('portal',         'URL of the online application portal',              False),
        ('Submit application to', 'How / where to submit the application',     False),
        ('URL',            'Direct URL to the programme page',                  False),
        ('Course location','City or campus where taught',                       False),
        ('Teaching language', 'Language(s) of instruction',                    False),
        ('Languages',      'Language requirements detail',                      False),
        ('Programme duration', 'Duration of the programme',                    False),
        ('Beginning',      'Intake semester or month',                          False),
        ('Description/content', 'Programme description and content overview',  False),
        ('Course organisation', 'Structure of the course',                     False),
        ('International elements', 'International aspects of the programme',   False),
        ('Course-specific, integrated German language courses', 'Yes/No',      False),
        ('Course-specific, integrated English language courses', 'Yes/No',     False),
        ('Semester contribution', 'Mandatory fees per semester',               False),
        ('Costs of living', 'Estimated monthly living costs',                  False),
        ('Funding opportunities within the university', 'Yes/No',              False),
        ('Description of the above-mentioned funding opportunities within the university', 'Funding details', False),
        ('Academic admission requirements', 'Academic requirements to apply',  False),
        ('Language requirements', 'Language test requirements',                False),
        ('Possibility of finding part-time employment', 'Part-time work rules', False),
        ('Accommodation', 'Accommodation options and info',                    False),
        ('Career advisory services and programmes for future professionals', 'Career support', False),
        ('Support for international students and doctoral candidates', 'International support', False),
        ('Full-time / part-time', 'Study intensity',                          False),
        ('Integrated internships', 'Internship information',                   False),
        ('Supervisor-student ratio', 'e.g. 1:20',                             False),
        ('Additional information on beginning, duration and mode of study', 'Extra study info', False),
        ('General services and support for international students and doctoral candidates', 'General services', False),
        ('Integrated/optional study abroad unit(s)', 'Study abroad options',   False),
        ('Current information', 'Latest news about the programme',             False),
        ('Description of other international elements', 'Other intl. info',   False),
        ('In cooperation with', 'Partner institutions',                        False),
        ('Diverse intercultural background of students', 'Student diversity',  False),
        ('Special promotion / funding of the programme', 'Special funding',   False),
        ('Mode of study', 'Full-time / Part-time / Distance',                 False),
        ('Name of DAAD funding programme', 'Specific DAAD programme',         False),
        ('Pace of course', 'Course intensity description',                     False),
        ('Phase(s) of attendance in Germany (applies to the entire programme)', 'Time in Germany', False),
        ('Technical equipment and programmes', 'IT resources available',       False),
        ('Certificates for specific modules are awarded', 'Yes/No',           False),
        ('Additional information on tuition fees', 'Extra fee details',       False),
    ]

    wb = openpyxl.Workbook()

    # ── Sheet 1: Data ─────────────────────────────────────────────────────────
    ws = wb.active
    ws.title = 'Data'

    green_fill  = PatternFill(start_color='16A34A', end_color='16A34A', fill_type='solid')
    req_fill    = PatternFill(start_color='14532D', end_color='14532D', fill_type='solid')
    white_bold  = Font(bold=True, color='FFFFFF', size=10)
    normal_font = Font(size=10)
    center      = Alignment(horizontal='center', vertical='center', wrap_text=False)
    left_wrap   = Alignment(horizontal='left',   vertical='top',    wrap_text=True)

    required_cols = {'University', 'Degree', 'course', 'Application deadline'}

    for col, header in enumerate(HEADERS, 1):
        cell       = ws.cell(row=1, column=col, value=header)
        cell.font  = white_bold
        cell.fill  = req_fill if header in required_cols else green_fill
        cell.alignment = center
        col_letter = cell.column_letter
        ws.column_dimensions[col_letter].width = max(16, min(len(header) + 3, 42))

    ws.row_dimensions[1].height = 38

    for col, value in enumerate(SAMPLE, 1):
        cell           = ws.cell(row=2, column=col, value=value)
        cell.font      = normal_font
        cell.alignment = left_wrap

    ws.row_dimensions[2].height = 30
    ws.freeze_panes = 'A2'

    # ── Sheet 2: Column Reference ─────────────────────────────────────────────
    ws2 = wb.create_sheet('Column Reference')

    ref_headers = ['#', 'Column Name', 'Required', 'Description']
    for col, h in enumerate(ref_headers, 1):
        cell      = ws2.cell(row=1, column=col, value=h)
        cell.font = white_bold
        cell.fill = green_fill
        cell.alignment = center

    ws2.column_dimensions['A'].width = 5
    ws2.column_dimensions['B'].width = 55
    ws2.column_dimensions['C'].width = 12
    ws2.column_dimensions['D'].width = 45

    req_font    = Font(bold=True, color='14532D', size=10)
    opt_font    = Font(size=10, color='64748B')
    yes_fill    = PatternFill(start_color='DCFCE7', end_color='DCFCE7', fill_type='solid')
    no_fill     = PatternFill(start_color='F8FAFC', end_color='F8FAFC', fill_type='solid')

    for row, (col_name, desc, required) in enumerate(COLUMN_REF, 2):
        ws2.cell(row=row, column=1, value=row - 1).font = Font(size=9, color='94A3B8')
        name_cell          = ws2.cell(row=row, column=2, value=col_name)
        name_cell.font     = req_font if required else opt_font
        name_cell.fill     = yes_fill if required else no_fill
        req_cell           = ws2.cell(row=row, column=3, value='✓ Yes' if required else 'Optional')
        req_cell.font      = Font(bold=required, color='16A34A' if required else '94A3B8', size=10)
        req_cell.alignment = center
        ws2.cell(row=row, column=4, value=desc).font = Font(size=10)

    ws2.freeze_panes = 'A2'

    # ── Serialize and return ──────────────────────────────────────────────────
    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)

    response = HttpResponse(
        buf.read(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    response['Content-Disposition'] = 'attachment; filename="nepgrad_template.xlsx"'
    return response


@api_view(['POST'])
@permission_classes([IsAdminUser])
@parser_classes([MultiPartParser, FormParser])
def upload_universities_excel(request):
    """
    Bulk-import programs from an Excel file (.xlsx/.xls).

    Expected columns (matching the DAAD export format):
      reason, course, University, Application deadline, application deadline 2,
      portal, Submit application to, URL, Degree, Course location, Teaching language,
      Languages, Programme duration, Beginning, Description/content, ...

    A University record is found-or-created by name.
    A Program record is updated-or-created by (university, name).

    Returns:
      {
        "created": <int>,
        "updated": <int>,
        "skipped": <int>,   // rows with no university or course name
        "errors": [{"row": <int>, "error": "<msg>"}, ...]
      }
    """
    try:
        import openpyxl
    except ImportError:
        return Response(
            {'error': 'openpyxl is not installed. Run: pip install openpyxl'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    serializer = ExcelUploadSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    uploaded_file = serializer.validated_data['file']
    default_country = serializer.validated_data.get('default_country', 'Germany')

    try:
        wb = openpyxl.load_workbook(uploaded_file, read_only=True, data_only=True)
        ws = wb.active
    except Exception as exc:
        return Response({'error': f'Could not open file: {exc}'}, status=status.HTTP_400_BAD_REQUEST)

    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return Response({'error': 'File is empty.'}, status=status.HTTP_400_BAD_REQUEST)

    # Build header → column-index map from row 1
    headers = [str(h).strip() if h is not None else '' for h in rows[0]]
    col_idx = {h: i for i, h in enumerate(headers) if h}

    def get(row, col_name):
        idx = col_idx.get(col_name)
        return _clean(row[idx]) if idx is not None and idx < len(row) else ''

    created = updated = skipped = 0
    errors = []

    for row_num, row in enumerate(rows[1:], start=2):
        try:
            university_name = get(row, 'University')
            course_name = get(row, 'course')

            if not university_name or not course_name:
                skipped += 1
                continue

            # Find or create university
            city = get(row, 'Course location')
            university, _ = University.objects.get_or_create(
                name=university_name,
                defaults={'country': default_country, 'city': city},
            )
            # Update city if it was empty before and we now have it
            if city and not university.city:
                university.city = city
                university.save(update_fields=['city'])

            # Build program field dict from column map
            program_fields = {}
            for excel_col, model_field in EXCEL_COLUMN_MAP.items():
                if excel_col in ('course',):
                    continue  # already captured as course_name
                val = get(row, excel_col)
                program_fields[model_field] = val

            # Degree type needs mapping from raw text → choice key
            raw_degree = get(row, 'Degree')
            program_fields['degree_type'] = _map_degree_type(raw_degree)

            # Truncate CharField values to their max_length to avoid DB errors
            _CHAR_LIMITS = {
                'reason': 100, 'portal': 500, 'program_url': 500,
                'course_location': 255, 'teaching_language': 100,
                'duration_text': 100, 'beginning': 255,
                'integrated_german_courses': 255, 'integrated_english_courses': 255,
                'funding_available': 50, 'study_mode': 100,
                'integrated_internships': 255, 'supervisor_student_ratio': 100,
                'mode_of_study': 100, 'daad_funding_programme': 255,
                'pace_of_course': 100,
            }
            for field, limit in _CHAR_LIMITS.items():
                if field in program_fields and len(program_fields[field]) > limit:
                    program_fields[field] = program_fields[field][:limit]

            _, was_created = Program.objects.update_or_create(
                university=university,
                name=course_name[:500],
                defaults=program_fields,
            )
            if was_created:
                created += 1
            else:
                updated += 1

        except Exception as exc:
            errors.append({'row': row_num, 'error': str(exc)})

    return Response({
        'created': created,
        'updated': updated,
        'skipped': skipped,
        'errors': errors,
    }, status=status.HTTP_200_OK)
