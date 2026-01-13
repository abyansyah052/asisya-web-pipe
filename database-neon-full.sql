--
-- PostgreSQL database dump
--

-- Dumped from database version 17.7 (e429a59)
-- Dumped by pg_dump version 17.5 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: get_next_code_number(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_next_code_number(p_prefix character varying) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE 
    result INTEGER;
BEGIN
    -- UPSERT: Insert new row OR update existing row atomically
    -- PostgreSQL guarantees this is a single atomic operation
    INSERT INTO code_sequences (prefix, next_num, updated_at) 
    VALUES (p_prefix, 2, CURRENT_TIMESTAMP)  -- Start with 2 because we return 1 for first insert
    ON CONFLICT (prefix) DO UPDATE 
    SET next_num = code_sequences.next_num + 1,
        updated_at = CURRENT_TIMESTAMP
    RETURNING next_num - 1 INTO result;  -- Return previous value (the one we're using)
    
    RETURN result;
END;
$$;


--
-- Name: FUNCTION get_next_code_number(p_prefix character varying); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_next_code_number(p_prefix character varying) IS 'Atomically get next code number for a prefix. Thread-safe for concurrent requests.';


--
-- Name: update_site_settings_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_site_settings_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._migrations (
    id integer NOT NULL,
    filename character varying(255) NOT NULL,
    applied_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    checksum character varying(64),
    applied_by character varying(255) DEFAULT 'github-actions'::character varying
);


--
-- Name: TABLE _migrations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public._migrations IS 'Tracks applied database migrations. Do not modify manually.';


--
-- Name: _migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public._migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: _migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public._migrations_id_seq OWNED BY public._migrations.id;


--
-- Name: admin_quotas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_quotas (
    id integer NOT NULL,
    admin_id integer NOT NULL,
    max_candidates integer DEFAULT 100,
    max_psychologists integer DEFAULT 10,
    max_exams integer DEFAULT 50,
    current_candidates integer DEFAULT 0,
    current_psychologists integer DEFAULT 0,
    current_exams integer DEFAULT 0,
    token_balance integer DEFAULT 0,
    tokens_used integer DEFAULT 0,
    valid_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: admin_quotas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_quotas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_quotas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_quotas_id_seq OWNED BY public.admin_quotas.id;


--
-- Name: answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.answers (
    id integer NOT NULL,
    attempt_id integer,
    question_id integer,
    selected_option_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: answers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.answers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: answers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.answers_id_seq OWNED BY public.answers.id;


--
-- Name: branding_access; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branding_access (
    id integer NOT NULL,
    last_updated_at timestamp without time zone DEFAULT now(),
    last_updated_by integer,
    admin_access_enabled boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: branding_access_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.branding_access_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: branding_access_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.branding_access_id_seq OWNED BY public.branding_access.id;


--
-- Name: branding_presets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branding_presets (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    logo_url text NOT NULL,
    company_name character varying(200) DEFAULT 'Asisya Consulting'::character varying NOT NULL,
    company_tagline character varying(500) DEFAULT 'Platform asesmen psikologi profesional'::character varying NOT NULL,
    primary_color character varying(20) DEFAULT '#0891b2'::character varying NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    created_by integer
);


--
-- Name: branding_presets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.branding_presets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: branding_presets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.branding_presets_id_seq OWNED BY public.branding_presets.id;


--
-- Name: candidate_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.candidate_codes (
    id integer NOT NULL,
    code character varying(16) NOT NULL,
    created_by integer NOT NULL,
    admin_id integer,
    candidate_id integer,
    exam_id integer,
    max_uses integer DEFAULT 1,
    current_uses integer DEFAULT 0,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    used_at timestamp with time zone,
    is_active boolean DEFAULT true,
    metadata jsonb DEFAULT '{}'::jsonb,
    company_code_id integer
);


--
-- Name: COLUMN candidate_codes.company_code_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.candidate_codes.company_code_id IS 'Reference to company_codes table for tracking which internal code was used.';


--
-- Name: candidate_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.candidate_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: candidate_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.candidate_codes_id_seq OWNED BY public.candidate_codes.id;


--
-- Name: candidate_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.candidate_groups (
    id integer NOT NULL,
    exam_id integer NOT NULL,
    candidate_id integer NOT NULL,
    assessor_id integer NOT NULL,
    assigned_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: candidate_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.candidate_groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: candidate_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.candidate_groups_id_seq OWNED BY public.candidate_groups.id;


--
-- Name: code_sequences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.code_sequences (
    prefix character varying(12) NOT NULL,
    next_num integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE code_sequences; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.code_sequences IS 'Atomic sequence table for access code generation. Prevents race conditions.';


--
-- Name: company_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_codes (
    id integer NOT NULL,
    code character varying(4) NOT NULL,
    company_name character varying(255) NOT NULL,
    organization_id integer,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE company_codes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.company_codes IS 'Internal code lookup table for candidate code generation. Format: 4-digit code (XXXX) mapped to company/category name. Managed by superadmin.';


--
-- Name: company_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.company_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: company_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.company_codes_id_seq OWNED BY public.company_codes.id;


--
-- Name: exam_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_answers (
    id integer NOT NULL,
    attempt_id integer NOT NULL,
    question_id integer NOT NULL,
    selected_option_id integer,
    answered_at timestamp with time zone DEFAULT now()
);


--
-- Name: exam_answers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.exam_answers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: exam_answers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.exam_answers_id_seq OWNED BY public.exam_answers.id;


--
-- Name: exam_assessors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_assessors (
    id integer NOT NULL,
    exam_id integer NOT NULL,
    admin_id integer NOT NULL,
    assigned_by integer,
    deleted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    candidate_ids integer[]
);


--
-- Name: exam_assessors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.exam_assessors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: exam_assessors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.exam_assessors_id_seq OWNED BY public.exam_assessors.id;


--
-- Name: exam_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_attempts (
    id integer NOT NULL,
    user_id integer,
    exam_id integer,
    start_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    end_time timestamp without time zone,
    score integer,
    status character varying(20) DEFAULT 'in_progress'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    pss_result text,
    pss_category character varying(50),
    srq_result text,
    srq_conclusion character varying(100),
    CONSTRAINT exam_attempts_status_check CHECK (((status)::text = ANY (ARRAY[('in_progress'::character varying)::text, ('completed'::character varying)::text])))
);


--
-- Name: exam_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.exam_attempts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: exam_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.exam_attempts_id_seq OWNED BY public.exam_attempts.id;


--
-- Name: exams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exams (
    id integer NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    duration_minutes integer DEFAULT 60 NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_special boolean DEFAULT false,
    instructions text,
    display_mode character varying(20) DEFAULT 'per_page'::character varying,
    thumbnail text,
    require_all_answers boolean DEFAULT false,
    exam_type character varying(20) DEFAULT 'general'::character varying,
    is_standard boolean DEFAULT false,
    CONSTRAINT exams_status_check CHECK (((status)::text = ANY (ARRAY[('draft'::character varying)::text, ('published'::character varying)::text, ('archived'::character varying)::text])))
);


--
-- Name: exams_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.exams_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: exams_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.exams_id_seq OWNED BY public.exams.id;


--
-- Name: mmpi_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mmpi_results (
    id integer NOT NULL,
    attempt_id integer NOT NULL,
    pdf_data text,
    raw_scores jsonb,
    t_scores jsonb,
    generated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: TABLE mmpi_results; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.mmpi_results IS 'Cached MMPI-180 PDF results for fast retrieval by psychologists';


--
-- Name: mmpi_results_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mmpi_results_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mmpi_results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mmpi_results_id_seq OWNED BY public.mmpi_results.id;


--
-- Name: options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.options (
    id integer NOT NULL,
    question_id integer,
    text text NOT NULL,
    is_correct boolean DEFAULT false
);


--
-- Name: options_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.options_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: options_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.options_id_seq OWNED BY public.options.id;


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    admin_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.organizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: organizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.organizations_id_seq OWNED BY public.organizations.id;


--
-- Name: questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questions (
    id integer NOT NULL,
    exam_id integer,
    text text NOT NULL,
    marks integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    question_type character varying(20) DEFAULT 'multiple_choice'::character varying,
    scale_min_label character varying(100),
    scale_max_label character varying(100),
    scale_min integer DEFAULT 1,
    scale_max integer DEFAULT 5
);


--
-- Name: questions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.questions_id_seq OWNED BY public.questions.id;


--
-- Name: site_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_settings (
    id integer NOT NULL,
    setting_key character varying(100) NOT NULL,
    setting_value text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: site_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.site_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: site_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.site_settings_id_seq OWNED BY public.site_settings.id;


--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profiles (
    id integer NOT NULL,
    user_id integer NOT NULL,
    nomor_peserta integer,
    tanggal_lahir date,
    usia integer,
    jenis_kelamin character varying(20),
    pendidikan_terakhir character varying(50),
    pekerjaan character varying(100),
    lokasi_test character varying(100),
    alamat_ktp text,
    nik character varying(16),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    full_name character varying(255),
    foto text,
    marital_status character varying(50),
    CONSTRAINT user_profiles_jenis_kelamin_check CHECK (((jenis_kelamin)::text = ANY (ARRAY[('Laki-laki'::character varying)::text, ('Perempuan'::character varying)::text])))
);


--
-- Name: user_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_profiles_id_seq OWNED BY public.user_profiles.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(20) NOT NULL,
    full_name character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    profile_completed boolean DEFAULT false,
    email character varying(255),
    is_active boolean DEFAULT true,
    registration_type character varying(50) DEFAULT 'manual'::character varying,
    organization_id integer,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['candidate'::character varying, 'psychologist'::character varying, 'admin'::character varying, 'super_admin'::character varying])::text[])))
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: _migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._migrations ALTER COLUMN id SET DEFAULT nextval('public._migrations_id_seq'::regclass);


--
-- Name: admin_quotas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_quotas ALTER COLUMN id SET DEFAULT nextval('public.admin_quotas_id_seq'::regclass);


--
-- Name: answers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answers ALTER COLUMN id SET DEFAULT nextval('public.answers_id_seq'::regclass);


--
-- Name: branding_access id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branding_access ALTER COLUMN id SET DEFAULT nextval('public.branding_access_id_seq'::regclass);


--
-- Name: branding_presets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branding_presets ALTER COLUMN id SET DEFAULT nextval('public.branding_presets_id_seq'::regclass);


--
-- Name: candidate_codes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_codes ALTER COLUMN id SET DEFAULT nextval('public.candidate_codes_id_seq'::regclass);


--
-- Name: candidate_groups id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_groups ALTER COLUMN id SET DEFAULT nextval('public.candidate_groups_id_seq'::regclass);


--
-- Name: company_codes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_codes ALTER COLUMN id SET DEFAULT nextval('public.company_codes_id_seq'::regclass);


--
-- Name: exam_answers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_answers ALTER COLUMN id SET DEFAULT nextval('public.exam_answers_id_seq'::regclass);


--
-- Name: exam_assessors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_assessors ALTER COLUMN id SET DEFAULT nextval('public.exam_assessors_id_seq'::regclass);


--
-- Name: exam_attempts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_attempts ALTER COLUMN id SET DEFAULT nextval('public.exam_attempts_id_seq'::regclass);


--
-- Name: exams id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams ALTER COLUMN id SET DEFAULT nextval('public.exams_id_seq'::regclass);


--
-- Name: mmpi_results id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mmpi_results ALTER COLUMN id SET DEFAULT nextval('public.mmpi_results_id_seq'::regclass);


--
-- Name: options id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.options ALTER COLUMN id SET DEFAULT nextval('public.options_id_seq'::regclass);


--
-- Name: organizations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations ALTER COLUMN id SET DEFAULT nextval('public.organizations_id_seq'::regclass);


--
-- Name: questions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions ALTER COLUMN id SET DEFAULT nextval('public.questions_id_seq'::regclass);


--
-- Name: site_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings ALTER COLUMN id SET DEFAULT nextval('public.site_settings_id_seq'::regclass);


--
-- Name: user_profiles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles ALTER COLUMN id SET DEFAULT nextval('public.user_profiles_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: _migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._migrations (id, filename, applied_at, checksum, applied_by) FROM stdin;
\.


--
-- Data for Name: admin_quotas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_quotas (id, admin_id, max_candidates, max_psychologists, max_exams, current_candidates, current_psychologists, current_exams, token_balance, tokens_used, valid_until, created_at, updated_at) FROM stdin;
4	2	200	20	50	0	0	0	500	0	\N	2026-01-06 11:45:37.177974+00	2026-01-06 11:45:37.177974+00
3	1	3000	30	3000	0	0	0	3000	0	\N	2026-01-06 11:45:37.177974+00	2026-01-09 13:14:50.546703+00
1	10	3000	30	3000	0	0	0	1000	0	\N	2026-01-06 06:32:50.885753+00	2026-01-09 13:15:11.463787+00
\.


--
-- Data for Name: answers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.answers (id, attempt_id, question_id, selected_option_id, created_at) FROM stdin;
\.


--
-- Data for Name: branding_access; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.branding_access (id, last_updated_at, last_updated_by, admin_access_enabled, updated_at) FROM stdin;
1	2026-01-08 14:12:27.752254	\N	f	2026-01-08 14:12:27.752254
2	2026-01-11 17:52:25.940184	\N	f	2026-01-11 17:52:25.940184
3	2026-01-11 17:59:22.429164	\N	f	2026-01-11 17:59:22.429164
4	2026-01-11 19:16:23.521132	\N	f	2026-01-11 19:16:23.521132
5	2026-01-11 19:32:46.167531	\N	f	2026-01-11 19:32:46.167531
6	2026-01-11 20:07:33.058772	\N	f	2026-01-11 20:07:33.058772
7	2026-01-11 20:19:54.134548	\N	f	2026-01-11 20:19:54.134548
8	2026-01-11 20:35:34.492986	\N	f	2026-01-11 20:35:34.492986
9	2026-01-11 21:24:49.560391	\N	f	2026-01-11 21:24:49.560391
10	2026-01-12 05:39:02.323751	\N	f	2026-01-12 05:39:02.323751
11	2026-01-12 05:43:04.191272	\N	f	2026-01-12 05:43:04.191272
12	2026-01-12 06:00:36.449516	\N	f	2026-01-12 06:00:36.449516
13	2026-01-12 06:04:03.650085	\N	f	2026-01-12 06:04:03.650085
14	2026-01-12 06:16:16.519786	\N	f	2026-01-12 06:16:16.519786
15	2026-01-12 07:20:53.482018	\N	f	2026-01-12 07:20:53.482018
16	2026-01-12 07:32:54.930439	\N	f	2026-01-12 07:32:54.930439
17	2026-01-12 08:08:23.717756	\N	f	2026-01-12 08:08:23.717756
18	2026-01-12 08:18:23.169181	\N	f	2026-01-12 08:18:23.169181
19	2026-01-12 08:33:52.974648	\N	f	2026-01-12 08:33:52.974648
20	2026-01-12 09:05:22.595879	\N	f	2026-01-12 09:05:22.595879
21	2026-01-12 09:09:48.097368	\N	f	2026-01-12 09:09:48.097368
22	2026-01-12 09:21:53.244291	\N	f	2026-01-12 09:21:53.244291
23	2026-01-12 09:30:03.02039	\N	f	2026-01-12 09:30:03.02039
24	2026-01-12 09:37:02.923623	\N	f	2026-01-12 09:37:02.923623
25	2026-01-12 10:03:49.384125	\N	f	2026-01-12 10:03:49.384125
26	2026-01-12 10:35:58.617377	\N	f	2026-01-12 10:35:58.617377
27	2026-01-12 10:41:18.753374	\N	f	2026-01-12 10:41:18.753374
28	2026-01-12 11:16:08.056013	\N	f	2026-01-12 11:16:08.056013
29	2026-01-12 12:12:33.547083	\N	f	2026-01-12 12:12:33.547083
30	2026-01-12 16:28:40.471221	\N	f	2026-01-12 16:28:40.471221
31	2026-01-12 16:46:03.441119	\N	f	2026-01-12 16:46:03.441119
32	2026-01-12 16:55:28.124471	\N	f	2026-01-12 16:55:28.124471
33	2026-01-12 17:30:03.63022	\N	f	2026-01-12 17:30:03.63022
34	2026-01-12 18:08:07.106304	\N	f	2026-01-12 18:08:07.106304
\.


--
-- Data for Name: branding_presets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.branding_presets (id, name, logo_url, company_name, company_tagline, primary_color, is_default, created_at, created_by) FROM stdin;
1	Asisya (Default)	/asisya.png	Asisya Consulting	Platform asesmen psikologi profesional	#0891b2	t	2026-01-08 14:12:27.716698	\N
2	Kimia Farma	data:image/jpeg;base64,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6dPTWRzz8Jze1r3bJba92S+Utimrj2rKLGTtOhDIaq2B3Ers3UcuTUftUfdlx27cRUfPumu/ryTMenhDF4XeNV9P139SKXUfuiSbWOHr/DHP5Ey9NF96DYb87qMzFqtJO53XHpH0G3jc6PH7Sce/it+qlS+5xk197KV9DxN2pNfDjj70zcXpo93fhdO5Jz/j7svP+Gvx63GPTjYuO14CtkVUA3XC8IDWGbLZeFlo4/OCtZr+t5NXHw9qjG0+7cnXk3wq8/sry9Cw02gjhe63KXNN90v/AB8r/AwCj3RGlBAn8Y1PYKEG1eIDsBt96W87SW/aTNd7If5v5kd9Iwue93d38LuydelactNVdS/lqrStf8qKFH0/YTJN27LtKuCrnw+iAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIB//Z	Kimia Farma	Platform asesmen psikologi profesional	#ffa500	f	2026-01-08 14:36:00.250288	9
3	Asisya (Default)	/asisya.png	Asisya Consulting	Platform asesmen psikologi profesional	#0891b2	t	2026-01-11 17:52:25.572066	\N
4	Asisya (Default)	/asisya.png	Asisya Consulting	Platform asesmen psikologi profesional	#0891b2	t	2026-01-11 17:59:21.981939	\N
5	Asisya (Default)	/asisya.png	Asisya Consulting	Platform asesmen psikologi profesional	#0891b2	t	2026-01-11 19:16:23.125017	\N
6	Asisya (Default)	/asisya.png	Asisya Consulting	Platform asesmen psikologi profesional	#0891b2	t	2026-01-11 19:32:45.699407	\N
7	Asisya (Default)	/asisya.png	Asisya Consulting	Platform asesmen psikologi profesional	#0891b2	t	2026-01-11 20:07:32.665138	\N
8	Asisya (Default)	/asisya.png	Asisya Consulting	Platform asesmen psikologi profesional	#0891b2	t	2026-01-11 20:19:53.696559	\N
9	Asisya (Default)	/asisya.png	Asisya Consulting	Platform asesmen psikologi profesional	#0891b2	t	2026-01-11 20:35:34.070037	\N
10	Asisya (Default)	/asisya.png	Asisya Consulting	Platform asesmen psikologi profesional	#0891b2	t	2026-01-11 21:24:49.170457	\N
11	Asisya (Default)	/asisya.png	Asisya Consulting	Platform asesmen psikologi profesional	#0891b2	t	2026-01-12 05:39:01.948233	\N
12	Asisya (Default)	/asisya.png	Asisya Consulting	Platform asesmen psikologi profesional	#0891b2	t	2026-01-12 05:43:03.81061	\N
13	Asisya (Default)	/asisya.png	Asisya Consulting	Platform asesmen psikologi profesional	#0891b2	t	2026-01-12 06:00:36.07597	\N
14	Asisya (Default)	/asisya.png	Asisya Consulting	Platform asesmen psikologi profesional	#0891b2	t	2026-01-12 06:04:03.198269	\N
15	Asisya (Default)	/asisya.png	Asisya Consulting	Platform asesmen psikologi profesional	#0891b2	t	2026-01-12 06:16:16.09914	\N
16	Asisya (Default)	/asisya.png	Asisya Consulting	Platform asesmen psikologi profesional	#0891b2	t	2026-01-12 07:20:53.036268	\N
17	Asisya (Default)	/asisya.png	Asisya Consulting	Platform asesmen psikologi profesional	#0891b2	t	2026-01-12 07:32:54.444623	\N
18	Asisya (Default)	/asisya.png	Asisya Consulting	Platform asesmen psikologi profesional	#0891b2	t	2026-01-12 08:08:23.295769	\N
19	Asisya (Default)	/asisya.png	Asisya Consulting	Platform asesmen psikologi profesional	#0891b2	t	2026-01-12 08:18:22.799294	\N
20	Asisya (Default)	/asisya.png	Asisya Consulting	Platform asesmen psikologi profesional	#0891b2	t	2026-01-12 08:33:52.480415	\N
21	Asisya (Default)	/asisya.png	Asisya Consulting	Platform asesmen psikologi profesional	#0891b2	t	2026-01-12 09:05:22.201505	\N
22	Asisya (Default)	/asisya.png	Asisya Consulting	Platform asesmen psikologi profesional	#0891b2	t	2026-01-12 09:09:47.727535	\N
23	Asisya (Default)	/asisya.png	Asisya Consulting	Platform asesmen psikologi profesional	#0891b2	t	2026-01-12 09:21:52.815079	\N
24	Asisya (Default)	/asisya.png	Asisya Consulting	Platform asesmen psikologi profesional	#0891b2	t	2026-01-12 09:30:02.646202	\N
25	Asisya (Default)	/asisya.png	Asisya Consulting	Platform asesmen psikologi profesional	#0891b2	t	2026-01-12 09:37:02.482236	\N
26	Asisya (Default)	/asisya.png	Asisya Consulting	Platform asesmen psikologi profesional	#0891b2	t	2026-01-12 10:03:48.902803	\N
27	Asisya (Default)	/asisya.png	Asisya Consulting	Platform asesmen psikologi profesional	#0891b2	t	2026-01-12 10:35:58.183824	\N
28	Asisya (Default)	/asisya.png	Asisya Consulting	Platform asesmen psikologi profesional	#0891b2	t	2026-01-12 10:41:18.320052	\N
29	Asisya (Default)	/asisya.png	Asisya Consulting	Platform asesmen psikologi profesional	#0891b2	t	2026-01-12 11:16:07.554522	\N
30	Asisya (Default)	/asisya.png	Asisya Consulting	Platform asesmen psikologi profesional	#0891b2	t	2026-01-12 12:12:33.178404	\N
31	Asisya (Default)	/asisya.png	Asisya Consulting	Platform asesmen psikologi profesional	#0891b2	t	2026-01-12 16:28:39.989768	\N
32	Asisya (Default)	/asisya.png	Asisya Consulting	Platform asesmen psikologi profesional	#0891b2	t	2026-01-12 16:46:03.058236	\N
33	Asisya (Default)	/asisya.png	Asisya Consulting	Platform asesmen psikologi profesional	#0891b2	t	2026-01-12 16:55:27.736231	\N
34	Asisya (Default)	/asisya.png	Asisya Consulting	Platform asesmen psikologi profesional	#0891b2	t	2026-01-12 17:30:03.153268	\N
35	Asisya (Default)	/asisya.png	Asisya Consulting	Platform asesmen psikologi profesional	#0891b2	t	2026-01-12 18:08:06.726965	\N
\.


--
-- Data for Name: candidate_codes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.candidate_codes (id, code, created_by, admin_id, candidate_id, exam_id, max_uses, current_uses, expires_at, created_at, used_at, is_active, metadata, company_code_id) FROM stdin;
1	NNGT-DFKU-ZLU2	13	\N	14	\N	1	1	2026-01-08 11:25:26.412+00	2026-01-06 11:25:27.190502+00	2026-01-06 12:24:35.477553+00	t	{"name": "Budi"}	\N
2	T3HP-WBRN-3AAV	13	\N	15	\N	1	1	2026-01-13 15:32:10.396+00	2026-01-06 15:32:10.429069+00	2026-01-06 15:32:18.639999+00	t	{"name": "TESTER"}	\N
4	LDP3-GB58-298T	1	\N	17	\N	1	1	2026-01-13 18:22:47.314+00	2026-01-06 18:22:47.352739+00	2026-01-06 18:36:23.959935+00	t	{"name": "testing"}	\N
3	Z7SB-KU7H-WWTG	1	\N	18	\N	1	1	2026-01-13 18:17:56.449+00	2026-01-06 18:17:56.484335+00	2026-01-06 19:09:05.908268+00	t	{"name": "testing"}	\N
5	MD3T-6H2Q-7ALN	1	\N	19	\N	1	1	2026-01-14 21:12:29.115+00	2026-01-07 21:12:29.119737+00	2026-01-07 21:12:49.739586+00	t	{"name": "hrhrhrh"}	\N
6	4NDT-VGPM-73RY	1	\N	20	\N	1	1	2026-01-14 21:15:34.406+00	2026-01-07 21:15:34.408853+00	2026-01-07 21:16:01.158483+00	t	{"name": "meutia"}	\N
7	4S3N-HAZQ-UXF4	1	\N	21	\N	1	1	2026-01-15 08:30:24.029+00	2026-01-08 08:30:24.063377+00	2026-01-08 11:05:03.383384+00	f	{"name": "coba terakhir"}	\N
8	WVFT-HF78-7ZCG	1	\N	22	\N	1	1	2026-01-15 12:37:24.53+00	2026-01-08 12:37:24.564586+00	2026-01-08 12:37:44.091015+00	f	{"name": "vvv"}	\N
9	ZYDG-QNYG-RD84	1	\N	23	\N	1	1	2026-01-15 13:37:06.632+00	2026-01-08 13:37:06.663968+00	2026-01-08 13:37:17.377136+00	f	{"name": "dudung"}	\N
13	U5SS903E	1	\N	\N	\N	1	0	2026-01-15 18:00:03.217+00	2026-01-08 18:00:03.476777+00	\N	f	{"candidate_name": "Jagat"}	\N
12	7A0Z3CDE	1	\N	\N	\N	1	0	2026-01-15 18:00:03.217+00	2026-01-08 18:00:03.475551+00	\N	f	{"candidate_name": "Santoso"}	\N
11	0DP8FYXE	1	\N	\N	\N	1	0	2026-01-15 18:00:03.217+00	2026-01-08 18:00:03.399208+00	\N	f	{"candidate_name": "Yulianti"}	\N
10	9JPD-9J9U-WLWF	1	\N	24	5	1	1	2026-01-15 16:41:50.032+00	2026-01-08 16:41:50.034044+00	2026-01-08 16:42:08.057579+00	f	{"name": "kkkkk"}	\N
14	X6MT-TDRP-ABQW	1	\N	25	\N	1	1	2026-01-15 18:01:03.668+00	2026-01-08 18:01:03.678651+00	2026-01-08 18:01:17.462232+00	t	{"name": "cccc"}	\N
17	05XYQ3M0	1	\N	\N	\N	1	0	2026-01-15 18:41:53.505+00	2026-01-08 18:41:53.52993+00	\N	f	{"candidate_name": "Jagat"}	\N
16	6FEJAK3Q	1	\N	\N	\N	1	0	2026-01-15 18:41:53.505+00	2026-01-08 18:41:53.527747+00	\N	f	{"candidate_name": "Santoso"}	\N
15	O4ZMJNEJ	1	\N	\N	\N	1	0	2026-01-15 18:41:53.505+00	2026-01-08 18:41:53.513179+00	\N	f	{"candidate_name": "Yulianti"}	\N
18	HTTK-FWZM-FC23	1	\N	26	\N	1	1	2026-01-15 18:44:11.088+00	2026-01-08 18:44:11.090308+00	2026-01-08 18:44:17.534768+00	t	{"name": "uuu"}	\N
21	KSZFJY4X5PPE1UEI	1	\N	27	\N	1	1	2026-01-15 19:24:48.476+00	2026-01-08 19:24:49.919066+00	2026-01-08 19:25:49.794142+00	t	{"candidate_name": "Jagat"}	\N
20	DQ8YYTCB1QW9UHGD	1	\N	28	\N	1	1	2026-01-15 19:24:48.476+00	2026-01-08 19:24:49.917579+00	2026-01-08 19:45:16.580792+00	t	{"candidate_name": "Santoso"}	\N
19	J6R9FC6BHE387S0L	1	\N	29	\N	1	1	2026-01-15 19:24:48.476+00	2026-01-08 19:24:49.863699+00	2026-01-08 20:22:36.325179+00	t	{"candidate_name": "Yulianti"}	\N
22	N4C9-7NE2-EQ9B	1	\N	\N	\N	1	0	2026-01-15 20:56:23.953+00	2026-01-08 20:56:23.957039+00	\N	f	{"name": "terakhir"}	\N
23	8LWN5EQ64QH7KGUG	1	\N	30	\N	1	1	2026-01-15 21:01:34.084+00	2026-01-08 21:01:34.087108+00	2026-01-08 21:01:43.247851+00	t	{"name": "terakhir"}	\N
24	WAHAWYCTGHBJHARH	1	\N	31	\N	1	1	2026-01-16 11:33:06.408+00	2026-01-09 11:33:06.409557+00	2026-01-09 11:33:26.794729+00	t	{"name": "Percobaan"}	\N
25	Z4ELUDDV8PZPSQ9Q	1	\N	32	\N	1	1	2026-01-16 13:17:50.306+00	2026-01-09 13:17:50.307506+00	2026-01-09 13:18:00.264899+00	t	{"name": "tester"}	\N
26	IQ2907UID8J9ZTG4	1	\N	\N	\N	1	0	2026-01-16 14:21:26.051+00	2026-01-09 14:21:26.052604+00	\N	t	{"candidate_name": "Ratna"}	\N
27	UTUION9VU8IKZ39M	1	\N	\N	\N	1	0	2026-01-16 14:21:26.051+00	2026-01-09 14:21:26.055101+00	\N	t	{"candidate_name": "Ratni"}	\N
28	PBZCY55DAU7LVFU2	1	\N	33	5	1	1	2026-01-16 14:22:34.234+00	2026-01-09 14:22:34.235113+00	2026-01-09 14:22:55.310452+00	t	{"name": "Menyusul"}	\N
29	UGL9NBJHUZPQM1Z8	1	\N	\N	\N	1	0	2026-01-17 10:53:18.454+00	2026-01-10 10:53:18.457055+00	\N	t	{"candidate_name": "Budi Santoso"}	\N
30	1BPX3D2PEGGD5GP8	1	\N	\N	\N	1	0	2026-01-17 10:53:18.454+00	2026-01-10 10:53:18.469436+00	\N	t	{"candidate_name": "Ani Wijaya"}	\N
32	O61UZP6LR2590LEE	1	\N	\N	\N	1	0	2026-01-17 10:53:18.454+00	2026-01-10 10:53:18.474693+00	\N	f	{"candidate_name": "7"}	\N
31	TCXX6AM6J9UQXPJO	1	\N	34	\N	1	1	2026-01-17 10:53:18.454+00	2026-01-10 10:53:18.4709+00	2026-01-10 10:54:35.66427+00	t	{"candidate_name": "Ahmad Hidayat"}	\N
2428	0126-0000-0001	1	\N	67	\N	1	1	2026-01-19 08:02:12.143+00	2026-01-12 08:02:12.142049+00	2026-01-12 08:02:45.041461+00	t	{}	2
34	0126-2001-0002	1	\N	51	\N	1	1	2026-01-18 21:18:21.78+00	2026-01-11 21:18:21.780362+00	2026-01-12 05:29:27.483788+00	t	{"candidate_name": "percobaan"}	1
33	0126-2001-0001	1	\N	62	\N	1	1	2026-01-18 21:17:17.529+00	2026-01-11 21:17:17.529273+00	2026-01-12 06:53:32.291736+00	t	{"name": "Yanto"}	1
35	0126-2001-0003	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADELLIA FEBBYANTI PUTRI SISWANTO"}	1
36	0126-2001-0004	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AGUNG BACHTIAR"}	1
37	0126-2001-0005	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALFINDA RIZKA AFIFAH"}	1
38	0126-2001-0006	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALFRIDA NAILA DARMAWAN"}	1
39	0126-2001-0007	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALEX IRWANTO"}	1
40	0126-2001-0008	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SALSABILA AL ZAINA"}	1
41	0126-2001-0009	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AMANDA ALIFYA PUTRI"}	1
42	0126-2001-0010	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANDHINI DWI SAPUTRI"}	1
43	0126-2001-0011	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMAD ANTAFANI KUSUMA"}	1
44	0126-2001-0012	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARIFA RADHIYYA FARISTA"}	1
45	0126-2001-0013	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARSYI ANDHIKA"}	1
46	0126-2001-0014	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ATIKA YUNI TAMARA"}	1
47	0126-2001-0015	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AULIA MUTHIA DEWI"}	1
48	0126-2001-0016	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AUVI CRISANTA ANA BELA"}	1
49	0126-2001-0017	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AYU LESTARI"}	1
50	0126-2001-0018	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AYU OKTAVIANA PUTRI"}	1
51	0126-2001-0019	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD AZHAR IBNU WIGUNA"}	1
52	0126-2001-0020	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AZMI IMANI YULIANTI"}	1
53	0126-2001-0021	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BELVA MIEKO SUPARWANTO"}	1
54	0126-2001-0022	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SALSABILLA ANDHARA OKSANA PRATIWI"}	1
55	0126-2001-0023	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BIMA RIZKY AWSHONY"}	1
56	0126-2001-0024	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "CALIZA AULIA DEWI"}	1
57	0126-2001-0025	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "CLARISTA BUNGA RAHMADHANI"}	1
58	0126-2001-0026	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DANILIA LAURA LISTIYANI"}	1
59	0126-2001-0027	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DAVID APRIANTO PANJAITAN"}	1
60	0126-2001-0028	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAIHANA KHALIKA PUTRI"}	1
61	0126-2001-0029	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DIANE AGRICIA JUSTICE HALOHO"}	1
62	0126-2001-0030	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DIMAS ABIAN IHSAN"}	1
63	0126-2001-0031	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DINDA FALLYSHA SORAYA ALTHAF"}	1
64	0126-2001-0032	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DITA DARA AULIA"}	1
65	0126-2001-0033	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DITA MARETAH SIMANUNGKALIT"}	1
66	0126-2001-0034	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DESTI ANGGRAINI"}	1
67	0126-2001-0035	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ELFARI NOVISYAH RAMADHINI"}	1
68	0126-2001-0036	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ERNA SARI FEBRIANI"}	1
69	0126-2001-0037	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD FADHIL MAULANA"}	1
70	0126-2001-0038	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FALIZA ULFANI"}	1
71	0126-2001-0039	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FARADINA AGIESTA ANJALI"}	1
72	0126-2001-0040	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FATIHATUL JANNAH"}	1
73	0126-2001-0041	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NABILA  FAUZIA"}	1
74	0126-2001-0042	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FILDZA KARAMINA AZIMA"}	1
75	0126-2001-0043	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GHINA ZAHIRA WALTZ"}	1
76	0126-2001-0044	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD HAFIZUR RAHMAN"}	1
77	0126-2001-0045	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HAMEIDATUL RAHMA QONITA"}	1
78	0126-2001-0046	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AULIA HANUNAIDA"}	1
79	0126-2001-0047	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IKHSAN PERDANA"}	1
80	0126-2001-0048	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "INDRA YUDHA PRASETYA"}	1
81	0126-2001-0049	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IRLINDA FITRI OKTALISA"}	1
82	0126-2001-0050	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ULIMA MAFAATIHA NIKMAH"}	1
83	0126-2001-0051	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JULIA MARIANA SIMANJUNTAK"}	1
84	0126-2001-0052	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KURNIA RIZQI PRIHAPSARI"}	1
85	0126-2001-0053	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AHMAD LABIB HIDZQY"}	1
86	0126-2001-0054	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NOR RAHMAWATI LIBETI PUTRI"}	1
87	0126-2001-0055	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LISTIANA NURAINI"}	1
88	0126-2001-0056	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LOLA ASTRIANTI"}	1
89	0126-2001-0057	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LULU LUTFIYATUZ ZAHRO"}	1
90	0126-2001-0058	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M. RIZKI MAULANA AKBAR"}	1
91	0126-2001-0059	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MAYANG AVINDA ANGGRAENI"}	1
92	0126-2001-0060	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MEGI DWI FAHMI PRAKOSO"}	1
93	0126-2001-0061	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MIFTAHUL RAHMA"}	1
94	0126-2001-0062	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MU`ADZ"}	1
95	0126-2001-0063	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD FAUZAN MARHABANG"}	1
96	0126-2001-0064	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NAJWAN ZAKY AHMAD"}	1
97	0126-2001-0065	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NAMIRA VANYA YASMIN"}	1
98	0126-2001-0066	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NDARIN IRMASARI"}	1
99	0126-2001-0067	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NIEMAS ANDHIKA PUTRI"}	1
100	0126-2001-0068	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NISA' AFRIDA DEWI"}	1
101	0126-2001-0069	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NOVI YULIA PUTRI"}	1
102	0126-2001-0070	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NURUL FADILAH"}	1
103	0126-2001-0071	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NURUL MUTHMAINNA IBRAHIM"}	1
104	0126-2001-0072	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PETER PAULUS NICOLAUS"}	1
105	0126-2001-0073	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PUTRI SRI AYU WULANDARI"}	1
106	0126-2001-0074	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "QADRA ANANDA RAMADHANI"}	1
107	0126-2001-0075	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAFAEL KURNIAWAN ALBYSEPTRA PRATAMA"}	1
108	0126-2001-0076	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "REZZA MEDIANI FADILAH"}	1
109	0126-2001-0077	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIRI ALHAYYU"}	1
110	0126-2001-0078	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SALSABILA CAHYA PUTRI SAMPURNO"}	1
111	0126-2001-0079	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SALSALIA AYUNDA"}	1
112	0126-2001-0080	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SANIA NABILA"}	1
113	0126-2001-0081	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SEPTIANA NUR AINI"}	1
114	0126-2001-0082	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SHERIE NUGROHO"}	1
115	0126-2001-0083	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SHINTA KURNIA APRITASARI"}	1
116	0126-2001-0084	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SUNARSIH"}	1
117	0126-2001-0085	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SYAFA AZZAHRA"}	1
118	0126-2001-0086	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SYAQIRA AFIFAH"}	1
119	0126-2001-0087	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TAUFIQ QURROHMAN"}	1
120	0126-2001-0088	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TAUFIQURRAHMAN"}	1
121	0126-2001-0089	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TRIANA SALSABILA KUSUMA DEWI"}	1
122	0126-2001-0090	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "WALISANI MIKOLATIA"}	1
123	0126-2001-0091	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "WIDHARMA ARYA NOVENZA RIFALDY"}	1
124	0126-2001-0092	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YULITA KURNIA UTAMI"}	1
125	0126-2001-0093	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YULY KRISTINA"}	1
126	0126-2001-0094	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YUSUF NASRULLOH"}	1
127	0126-2001-0095	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AFTAH FITROTUNNISA ADANTY"}	1
128	0126-2001-0096	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALAM ZALFI HURMUZI"}	1
129	0126-2001-0097	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALDI ALDIANSYAH"}	1
130	0126-2001-0098	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD ALDI SETIA"}	1
131	0126-2001-0099	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALIEF AKMAL HUSIN"}	1
132	0126-2001-0100	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALILA KANAYADIBA"}	1
133	0126-2001-0101	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANISA SALMA NABILA"}	1
134	0126-2001-0102	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARI LILIK HIDAYAH"}	1
135	0126-2001-0103	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANDI ASSYIFA MAPPEDECENG OKARNIATIF"}	1
136	0126-2001-0104	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AUDIA FORTUNA MUKTI"}	1
137	0126-2001-0105	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BERLIANA PUTRI BUANA"}	1
138	0126-2001-0106	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD DAFA RAIHAN HUDAYA"}	1
139	0126-2001-0107	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DIMAS ERIYANTO"}	1
140	0126-2001-0108	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DINDA INZANIA FAGHFIRLI"}	1
141	0126-2001-0109	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ELSA ROTUA SITOMPUL"}	1
142	0126-2001-0110	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FAJRI OKTA RAFLISIA"}	1
143	0126-2001-0111	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FARIDHUL ARSYAD"}	1
144	0126-2001-0112	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GITA ANGRAINI"}	1
145	0126-2001-0113	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HANA YULIA SISKA"}	1
146	0126-2001-0114	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HUMAM TRIANGGITO"}	1
147	0126-2001-0115	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IRVAN RIZKI MAYENDRA"}	1
148	0126-2001-0116	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JULIANTO TEGAR PRIYADI SURONOTO"}	1
149	0126-2001-0117	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "EKA NANDA FITRI ANGGRAENI UTOMO"}	1
150	0126-2001-0118	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LARASATI"}	1
151	0126-2001-0119	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD FARHAN JULIANSYAH"}	1
152	0126-2001-0120	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AHMAD FAUZI NUR"}	1
153	0126-2001-0121	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "REGITA FITRI CAHYANI"}	1
154	0126-2001-0122	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RICO AGUNG RAHMANTO"}	1
155	0126-2001-0123	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SIROJUDIN IMAM ROCHANI"}	1
156	0126-2001-0124	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SITI NUR AIINI"}	1
157	0126-2001-0125	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SUCI INDAH ANNISA PUTRI"}	1
158	0126-2001-0126	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARTIKA SARI DEWI"}	1
159	0126-2001-0127	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "VANYA ARDIANI"}	1
160	0126-2001-0128	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "WILDAN PRIAMBODO"}	1
161	0126-2001-0129	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MADE BAGUS SATRYA WIRAWAN"}	1
162	0126-2001-0130	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AYU SAPUTRI"}	1
163	0126-2001-0131	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SYAHRIL AQIL AFKAR MUHARRAM"}	1
164	0126-2001-0132	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AL-FICKRY GHANISHAFA PRADHANA"}	1
165	0126-2001-0133	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALIFIA SHOFY AFIFA"}	1
166	0126-2001-0134	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALLIZA FITRI DEWI"}	1
167	0126-2001-0135	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANANDITA EKA MEYLANIPUTRI"}	1
168	0126-2001-0136	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARUM SRIKATON"}	1
169	0126-2001-0137	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AUDY RIZKY RAHMAWATI"}	1
170	0126-2001-0138	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "CITRA AMALIA SUSNINGTYAS"}	1
171	0126-2001-0139	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DELLA SELPANI"}	1
172	0126-2001-0140	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DENILA WAHYU MUSTIKASARI"}	1
173	0126-2001-0141	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ASTRI DESMARANI"}	1
174	0126-2001-0142	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DWI PUJI LESTARI"}	1
175	0126-2001-0143	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD EKO RAMADHAN"}	1
176	0126-2001-0144	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ELISABETH NADINE AURELIA"}	1
177	0126-2001-0145	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD FAISAL SHALEH"}	1
178	0126-2001-0146	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD FAIZ PRAJA UTOMO"}	1
179	0126-2001-0147	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD FAJRI"}	1
180	0126-2001-0148	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GERI DWI YUDHA SATRIA"}	1
181	0126-2001-0149	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GHINA SALSABILLA ISKANDAR"}	1
182	0126-2001-0150	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ROZZIQIIN HABIBIE"}	1
183	0126-2001-0151	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RASYIQAH LINATI"}	1
184	0126-2001-0152	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "INKA MAHARANI"}	1
185	0126-2001-0153	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KELPIN KALADRI"}	1
186	0126-2001-0154	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LARAS NURUL SYAMSY"}	1
187	0126-2001-0155	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LENNI TIASNINGRUM"}	1
188	0126-2001-0156	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LEONARDO JEREMI KISEK"}	1
189	0126-2001-0157	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LILIAN NAILA ZAFIRAH"}	1
190	0126-2001-0158	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LUTFI FAHRIANDI BATUBARA"}	1
191	0126-2001-0159	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MERI TANZIL"}	1
192	0126-2001-0160	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MIRANTI"}	1
193	0126-2001-0161	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MIRA ROSADA"}	1
194	0126-2001-0162	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MIRZA LUTFILHADI HIDAYATULLAH"}	1
195	0126-2001-0163	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MOHAMMAD THAARIQ HENDRAWAN"}	1
196	0126-2001-0164	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MONIKA CITRA PEBRIYANTI"}	1
197	0126-2001-0165	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MARTIN PANOLUI"}	1
198	0126-2001-0166	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RR. NABILLA NURUL AINNI"}	1
199	0126-2001-0167	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANISSA NADINE PUTRI KOWAAS"}	1
200	0126-2001-0168	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NADIZA VIRZA"}	1
201	0126-2001-0169	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NADYA RAMAHDANI PUTRI"}	1
202	0126-2001-0170	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NAUMI FEBY ANI"}	1
203	0126-2001-0171	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NIMAS DESTIAWATI"}	1
204	0126-2001-0172	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NISYA SAFITRI"}	1
205	0126-2001-0173	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NOVIA RAIHANA B"}	1
206	0126-2001-0174	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PUTERI RENITA NUR ABIDARI"}	1
207	0126-2001-0175	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAFFI ARREDHO FAWAZA"}	1
208	0126-2001-0176	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAHMAD DWI PRAMUDYA"}	1
209	0126-2001-0177	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAI NURDIANSYAH"}	1
210	0126-2001-0178	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "REZA PUTRI KURNIASARI"}	1
211	0126-2001-0179	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ROHANA"}	1
212	0126-2001-0180	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIAN KARDANA"}	1
213	0126-2001-0181	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RISMA SULISTYO WARDANI"}	1
214	0126-2001-0182	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RISTIKA ANGGIT PRAMESTI"}	1
215	0126-2001-0183	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIZKA IRNANDIANIS SILAEN"}	1
216	0126-2001-0184	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SAFA KUSUMA WARDANI"}	1
217	0126-2001-0185	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "VANESSA FITRI"}	1
218	0126-2001-0186	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YOGA ADY NUGROHO"}	1
219	0126-2001-0187	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TRIYOKO"}	1
220	0126-2001-0188	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NIKO CANDRA ANUGRAH"}	1
221	0126-2001-0189	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD ABDILLAH"}	1
222	0126-2001-0190	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ACHMAD ADI PRASETYA"}	1
223	0126-2001-0191	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADELIA TRI KURNIA SARI"}	1
224	0126-2001-0192	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AINUL MARDIYYAH KENEDI"}	1
225	0126-2001-0193	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMAD ANDI SETIYAWAN"}	1
226	0126-2001-0194	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SUHESTI"}	1
227	0126-2001-0195	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD ARIQ MAHARDIKA"}	1
228	0126-2001-0196	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD ADNAN AZIZI"}	1
229	0126-2001-0197	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD ERVANTH ISADARRELL"}	1
230	0126-2001-0198	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SHAKIRA FERO ERLIANE"}	1
231	0126-2001-0199	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD HILMAN DWIKIYUDA"}	1
232	0126-2001-0200	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M. IQBAL NAFHI SETIAWAN"}	1
233	0126-2001-0201	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SITI KHOIRO UMATIN"}	1
234	0126-2001-0202	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KHOIRUL HIDAYAT"}	1
235	0126-2001-0203	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KHOIRUL IRAWAN"}	1
236	0126-2001-0204	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LATIFAN NURDIANSYAH"}	1
237	0126-2001-0205	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD FITRAH DIONO PUTRA"}	1
238	0126-2001-0206	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MALIHATUR ROFIFAH"}	1
239	0126-2001-0207	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M GALIH MAULANA"}	1
240	0126-2001-0208	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M. AZIZUL HAQ"}	1
241	0126-2001-0209	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MEIDY IQMAL SAPUTRA"}	1
242	0126-2001-0210	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M. HADI BY HAQI PULUNGAN"}	1
243	0126-2001-0211	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD HANIV KARAMY"}	1
244	0126-2001-0212	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MIFTACH DIMAS TRI KACANDRA"}	1
245	0126-2001-0213	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MOCHAMAD NUR AZMI"}	1
246	0126-2001-0214	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MOURINDA NURANISAH"}	1
247	0126-2001-0215	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M. REZA FIRDAUS"}	1
248	0126-2001-0216	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD ADNAN KADIR"}	1
249	0126-2001-0217	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMAD ZULFIKAR ARIF"}	1
250	0126-2001-0218	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD FARHAN FADHILAH"}	1
251	0126-2001-0219	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD KHATAMI"}	1
252	0126-2001-0220	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD UMAR ABDILLAH"}	1
253	0126-2001-0221	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUTIARA NUR LAILI"}	1
254	0126-2001-0222	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD ZAKKY DAFFA FAHREZZY"}	1
255	0126-2001-0223	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUTHIA HASNA NABILA"}	1
256	0126-2001-0224	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NABILLA KHOIRUN NISA"}	1
257	0126-2001-0225	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NAJWA MUTIARA AJIE"}	1
258	0126-2001-0226	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NAMIRA PURNAMA NOOR FIRDAUS"}	1
259	0126-2001-0227	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NAUFAL ARIF NURFATHURROZI"}	1
260	0126-2001-0228	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NEO ARBA BLIMA"}	1
261	0126-2001-0229	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NUWEL PRATAMA SARAGIH"}	1
262	0126-2001-0230	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "OKTAVIETNAMA PUTRI DIAN ELISA"}	1
263	0126-2001-0231	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "OLIVIA DIANDRA AZAHRA"}	1
264	0126-2001-0232	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PATRIO ALI AKBAR"}	1
265	0126-2001-0233	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PRIZA ALVI FARADANI"}	1
266	0126-2001-0234	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MOCHAMMAD PUPUNG WICHA SONO"}	1
267	0126-2001-0235	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PUTRI NUR CAHYANI"}	1
268	0126-2001-0236	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MOCHAMMAD RAFLY PUTRA INDRIANTO"}	1
269	0126-2001-0237	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD FATURRIDHO QOYYUMA"}	1
270	0126-2001-0238	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIRIN FARADILLA"}	1
271	0126-2001-0239	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RISKA NUR FADILAH SAFITRI"}	1
272	0126-2001-0240	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMAD RIZKI"}	1
273	0126-2001-0241	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ROSA AMELIA KLARETTA SIJABAT"}	1
274	0126-2001-0242	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SALSABILA ARPITA DHIYA FADHILAH"}	1
275	0126-2001-0243	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SALSABILA NIEKIE RAFIDA"}	1
276	0126-2001-0244	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SARDI HAZAIRIN"}	1
277	0126-2001-0245	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SAVIRA NUR LAILY"}	1
278	0126-2001-0246	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SHABRINA NUR AMALINA HUSNA"}	1
279	0126-2001-0247	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SHELLY AFRILIA"}	1
280	0126-2001-0248	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SIDIK SAPUTRA"}	1
281	0126-2001-0249	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SITI MUTHIA AZZAHRA"}	1
282	0126-2001-0250	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SUFANI"}	1
283	0126-2001-0251	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TAJIMAS DWI APRILIANI"}	1
284	0126-2001-0252	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TANIA SEOULINA"}	1
285	0126-2001-0253	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TASYA AULIA PUTRI"}	1
286	0126-2001-0254	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TAUFIQURACHIM"}	1
287	0126-2001-0255	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PRAMUDYA NOVANDY"}	1
288	0126-2001-0256	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALSYRA TASYA KURNIA"}	1
289	0126-2001-0257	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALVI ZURAIDAH"}	1
290	0126-2001-0258	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AMALIA NURBANIATI"}	1
291	0126-2001-0259	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AMELIA DELILA"}	1
292	0126-2001-0260	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AMELIA OCKTRIVIANI PUTRI"}	1
293	0126-2001-0261	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANISA NURUL FITROH"}	1
294	0126-2001-0262	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AURELIA ISTASYADIA FIRDAUS"}	1
295	0126-2001-0263	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AZIMA IQRA RADYTA MARDANI"}	1
296	0126-2001-0264	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DARA AZIZI"}	1
297	0126-2001-0265	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "CUT NUR ROUDATUL PUTRI JUWITA"}	1
298	0126-2001-0266	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DAFFA RIZKY RAMADHAN"}	1
299	0126-2001-0267	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DINARA ALYA YUDITHA"}	1
300	0126-2001-0268	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DITA FAISYAH ARTHARINI"}	1
301	0126-2001-0269	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DIVA AYU LESTARI"}	1
302	0126-2001-0270	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DWI YOLANDA PUTRI"}	1
303	0126-2001-0271	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ELIN ADELIA"}	1
304	0126-2001-0272	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ELZA MAULANI"}	1
305	0126-2001-0273	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ERISSA RAHMA YUNIAR"}	1
306	0126-2001-0274	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FARIDLATUL NIMAH"}	1
307	0126-2001-0275	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FEBYTRIA AULIA MADIANA"}	1
308	0126-2001-0276	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FIFI OLIVIA PUTRI"}	1
309	0126-2001-0277	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GHAESA NAFISAH RAHMAT"}	1
310	0126-2001-0278	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HANA SHAQINAH RAHMAN"}	1
311	0126-2001-0279	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HANISAH"}	1
312	0126-2001-0280	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HYUNDA BETZAHROSA VI WARDANA"}	1
313	0126-2001-0281	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JEANI UMI SUKMANING"}	1
314	0126-2001-0282	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DWI KARINA"}	1
315	0126-2001-0283	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FAKHMYRA RAHAYU DWIYANTHI"}	1
316	0126-2001-0284	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "R.A. LARASATI"}	1
317	0126-2001-0285	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAHMA NUR AYUDA"}	1
318	0126-2001-0286	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "EKA RAHMAWATI"}	1
319	0126-2001-0287	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GALIH RAHTAMA WANI"}	1
320	0126-2001-0288	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ETIKA RAMADHANI"}	1
321	0126-2001-0289	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "REVITA ALWISIA PURLIANO"}	1
322	0126-2001-0290	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANRIZA HAZRA EILFRIANA GURNING"}	1
323	0126-2001-0291	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HALIMATUSSADIAH"}	1
324	0126-2001-0292	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALDA DWIYANTI"}	1
325	0126-2001-0293	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AYUDYA GYANI SANTOSO"}	1
326	0126-2001-0294	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AYU IZZATUR RIZQIYYAH"}	1
327	0126-2001-0295	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "CAHYATI"}	1
328	0126-2001-0296	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AMANDA MARIA CAROLINE STEVANOVA PAKPAHAN"}	1
329	0126-2001-0297	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DEBI ESTER MARIA"}	1
330	0126-2001-0298	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DITA NASYWA PRATIWI"}	1
331	0126-2001-0299	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GENNI WILUTAMA"}	1
332	0126-2001-0300	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IMAS ALIFAH"}	1
333	0126-2001-0301	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FITRIANI SALSALINA BR GINTING"}	1
334	0126-2001-0302	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TSALTSA KHOERUN NISA"}	1
335	0126-2001-0303	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "VANESHA PUTRI ANGGITA"}	1
336	0126-2001-0304	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "VIRA DAMAYANTI"}	1
337	0126-2001-0305	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "WAHYU LUCYANA KUSUMASTUTI"}	1
338	0126-2001-0306	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "WINA DHEA MANTAWS"}	1
339	0126-2001-0307	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YARDAN AZIZ RAMADHAN"}	1
340	0126-2001-0308	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YARA QUSWARA SARAGIH"}	1
341	0126-2001-0309	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ZAZAIFUN HASNA TSABITAH"}	1
342	0126-2001-0310	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SITI FATIMATUZ ZAHRO"}	1
343	0126-2001-0311	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IRVAN MUHAMMAD UMAR"}	1
344	0126-2001-0312	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LASTRI ANDINI GUNAWAN"}	1
345	0126-2001-0313	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LATHIFA DYLLA NABILA"}	1
346	0126-2001-0314	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PASCALL AMARAN"}	1
347	0126-2001-0315	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PUTRI NUR INDAH"}	1
348	0126-2001-0316	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SALMA HALIMATU SYADIAH"}	1
349	0126-2001-0317	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SASI ANGGRAENI"}	1
350	0126-2001-0318	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SEPTIA FIRYAL SALSABILA"}	1
351	0126-2001-0319	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SITI AISYAH"}	1
352	0126-2001-0320	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SRI YANTI RISMENTINA BR SINAGA"}	1
353	0126-2001-0321	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SYITA NABILA TAZKIA"}	1
354	0126-2001-0322	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TASYA YUSYA SALSABILA"}	1
355	0126-2001-0323	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "INTAN FITRIANI"}	1
356	0126-2001-0324	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADILA WIDYA UTAMI"}	1
357	0126-2001-0325	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AGITA CERIA ISHAQ"}	1
358	0126-2001-0326	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AMANDA FAUZIA RAHMASARI"}	1
359	0126-2001-0327	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANNISA NURUL FIKRI"}	1
360	0126-2001-0328	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANNISA NURUL AZMI"}	1
361	0126-2001-0329	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANNISA SHOPIATUL QOLBU"}	1
362	0126-2001-0330	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ASSYRA MAHARANI"}	1
363	0126-2001-0331	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AULIA ZAHRA PUTRIKA"}	1
364	0126-2001-0332	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FRIDAYANA JUNIAR ARIFIN"}	1
365	0126-2001-0333	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AZIZAH ADYA AZAHRA"}	1
366	0126-2001-0334	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "CHERENCIA.PATODING"}	1
367	0126-2001-0335	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "CLAUDIA MAHARANI RIZAL"}	1
368	0126-2001-0336	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DINDA ARIFAH"}	1
369	0126-2001-0337	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DYNY ARYA SAPUTRI"}	1
370	0126-2001-0338	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HASNA INDAH NAFISAH"}	1
371	0126-2001-0339	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TURFA AGHNIYA HASNA"}	1
372	0126-2001-0340	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NAZILA BARKIAH"}	1
373	0126-2001-0341	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LENI WAHYUNI"}	1
374	0126-2001-0342	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RANISA NURFADILLA"}	1
375	0126-2001-0343	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NURSETYO APRILIANTI"}	1
376	0126-2001-0344	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KHAIRUNNISA HANDINI PROFITYAS"}	1
377	0126-2001-0345	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NATANIA PUTRI"}	1
378	0126-2001-0346	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RACHEL SONDANG THERESIA NADEAK"}	1
379	0126-2001-0347	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ZETA FAKHIRA EZWAR"}	1
380	0126-2001-0348	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LATANSA TSABBITA MAHMUDI"}	1
381	0126-2001-0349	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD RAFIF HAWARI"}	1
382	0126-2001-0350	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAUDA DEVI NURDIMAYTA MOEDIGDO"}	1
383	0126-2001-0351	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M RIAN ZARMI NIKARDO"}	1
384	0126-2001-0352	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "VRANS WILLY WOJONGAN"}	1
385	0126-2001-0353	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RASHIDA AZZAHRA"}	1
386	0126-2001-0354	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GIANINA AFIQAH PUTRI"}	1
387	0126-2001-0355	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HAIFA ASMA KARIMAH"}	1
388	0126-2001-0356	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALFIN PERMANA LUTFI"}	1
389	0126-2001-0357	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ENRICO LAUREN EBENEZER LUKITO"}	1
390	0126-2001-0358	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARYASUTA FAHARSYAH SETIAWAN"}	1
391	0126-2001-0359	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GATSHA FAJRIANSYAH"}	1
392	0126-2001-0360	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD RAFI PRATAMA"}	1
393	0126-2001-0361	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD ARDAN HAKIM"}	1
394	0126-2001-0362	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD BINTANG NIRWANA"}	1
395	0126-2001-0363	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YUNITA CHANDRADEWI PUSPANINGRUM"}	1
396	0126-2001-0364	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NAJWA"}	1
397	0126-2001-0365	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "EPHYTO ZUFAR PUTRA BASUKI"}	1
398	0126-2001-0366	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FYLAILY IZMI ADHISTY"}	1
399	0126-2001-0367	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AVILA ABILIA AZAHARA"}	1
400	0126-2001-0368	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FEBYONA JOLEST PUTERI"}	1
401	0126-2001-0369	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SYARIFAH HANINDYA"}	1
402	0126-2001-0370	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NISRINA HAYATI"}	1
403	0126-2001-0371	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NOURMALITA ANWAR"}	1
404	0126-2001-0372	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SAFIRA RAMADHANI"}	1
405	0126-2001-0373	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SHAFIRA NURULITA PUTRI"}	1
406	0126-2001-0374	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SYLVA NABILLA PUTRI WIRATOMO"}	1
407	0126-2001-0375	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TRI INAYAH BAGUS SETYAWATI"}	1
408	0126-2001-0376	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "OLYVIA YOSEPHINE MARGARETH SITORUS"}	1
409	0126-2001-0377	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SWASTIKA PUTRI PUSPITA MADANI"}	1
410	0126-2001-0378	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SYNTHIA MARSITA RAHMA"}	1
411	0126-2001-0379	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD AL FATIH"}	1
412	0126-2001-0380	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FERI WIJANARKO"}	1
413	0126-2001-0381	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KHOIRUL FIKRI"}	1
414	0126-2001-0382	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANGGITA PRAMESTI ANINDHITA SURYADI"}	1
415	0126-2001-0383	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARIFIA ZAHRA KEANHU"}	1
416	0126-2001-0384	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "CRISTINE ECLESIA SIGALINGGING"}	1
417	0126-2001-0385	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DESI AYU ISLAMIYAH"}	1
418	0126-2001-0386	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "INDAH NUGRAHA KRISTAMI"}	1
419	0126-2001-0387	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MAHIRA ATIKA BASRI"}	1
420	0126-2001-0388	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NASYA OKTAVINA NADEAK"}	1
421	0126-2001-0389	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RICHA DANIELLA"}	1
422	0126-2001-0390	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SHOFIA PENNI HARFIYANTO"}	1
423	0126-2001-0391	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SYLVIA THERESIA HUTAGALUNG"}	1
424	0126-2001-0392	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AFIFAH AFIYANI. Y"}	1
425	0126-2001-0393	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "INTAN PERMATA NINGRUM"}	1
426	0126-2001-0394	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NI PUTU MAETHA MAHARANI"}	1
427	0126-2001-0395	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MAYA NUR INDAH SARI"}	1
428	0126-2001-0396	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NOVIA YULI ENTY"}	1
429	0126-2001-0397	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "OLIVIA DAME MASTERINA"}	1
430	0126-2001-0398	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RINA TAUFIKA PRATIDINA"}	1
431	0126-2001-0399	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YESI YULIANA"}	1
432	0126-2001-0400	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANDI VEBY SARDY"}	1
433	0126-2001-0401	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD AKBAR SYAUQI"}	1
434	0126-2001-0402	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALIFAH GHINA KAMILIA"}	1
435	0126-2001-0403	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "INDAH NURJANAH"}	1
436	0126-2001-0404	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JIHAN NUR HASANAH"}	1
437	0126-2001-0405	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUSFIRAH DEWI LUMENTUT"}	1
438	0126-2001-0406	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "EVRILIN PARDEDE"}	1
439	0126-2001-0407	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ULMA LISA NUR HASANA"}	1
440	0126-2001-0408	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "I MADE AGUS WIDI ARYANA"}	1
441	0126-2001-0409	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "EVA DAMAYANTI SAFITRI"}	1
442	0126-2001-0410	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AGNESTIA DAMAIYANTI BR SIMBOLON"}	1
443	0126-2001-0411	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NAILATUL HIMMAH"}	1
444	0126-2001-0412	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "CINDI CLAUDIA TAMPUBOLON"}	1
445	0126-2001-0413	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KHALISHA DWITA KHAN"}	1
446	0126-2001-0414	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FANNIE FAHIRA"}	1
447	0126-2001-0415	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "UMMI AIDA RAHIM"}	1
448	0126-2001-0416	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SRI RAHMATUL HUSNA"}	1
449	0126-2001-0417	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NAYA SARI SARAGIH"}	1
450	0126-2001-0418	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADE MARDIANA"}	1
451	0126-2001-0419	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADNAN AFRIADI"}	1
452	0126-2001-0420	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AHMAD FADLY RIZQULLAH"}	1
453	0126-2001-0421	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MIKAEL ANGELINO FERDINANTIO SATRIO"}	1
454	0126-2001-0422	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SANDRA YORI"}	1
455	0126-2001-0423	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NUR HAMIDA"}	1
456	0126-2001-0424	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "WENVA QONITA LUTFIA"}	1
457	0126-2001-0425	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PUTRI ELRO MAUDIFIANY"}	1
458	0126-2001-0426	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DEA YOLANDA"}	1
459	0126-2001-0427	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SALSABILA NADIVA"}	1
460	0126-2001-0428	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ULFA EL YUSRA"}	1
461	0126-2001-0429	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NISA FITRI"}	1
462	0126-2001-0430	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD ZAINAL ABIDIN"}	1
463	0126-2001-0431	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BASO AHMAD ANUGRAH IZZULHAQ ABDULLAH"}	1
464	0126-2001-0432	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AKBAR FATUHUL SABILILLAH"}	1
465	0126-2001-0433	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AMALINA SAFITRI MUIZ"}	1
466	0126-2001-0434	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARIFAL TRIPRASETYO ADI"}	1
467	0126-2001-0435	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DAVID ADI KARUNIA"}	1
468	0126-2001-0436	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AKHMAD HIDAYATUL RAHIM"}	1
469	0126-2001-0437	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BAGUS YAYAN WICAKSONO"}	1
470	0126-2001-0438	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DHOBIT HABLI MELUAN EL HUSYAINI"}	1
471	0126-2001-0439	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KADEK DWI SUKARIAWAN"}	1
472	0126-2001-0440	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DZAKY MUSTOFA"}	1
473	0126-2001-0441	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DI ENDIRA FAIQ HILMI KUSUMA"}	1
474	0126-2001-0442	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FARHAN IBNU RIZVIQULLAH"}	1
475	0126-2001-0443	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FELIX ADRIANUS LUMBAN GAOL"}	1
476	0126-2001-0444	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FIRJATULLAH AZHAR MAULANI"}	1
477	0126-2001-0445	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GALIH ANDIKA PUTRA"}	1
478	0126-2001-0446	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GERALDO PANJAITAN"}	1
479	0126-2001-0447	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "I GEDE SINDU YOGA ARTAWAN"}	1
480	0126-2001-0448	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IHSAN PRIMA FAZA"}	1
481	0126-2001-0449	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "INTAN AULIA CHAMILA"}	1
482	0126-2001-0450	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RINTAN JANISYA"}	1
483	0126-2001-0451	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JON HEWITT"}	1
484	0126-2001-0452	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JOY RAFLI MALAU"}	1
485	0126-2001-0453	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SARI YULIA"}	1
486	0126-2001-0454	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IJLAL RAFIF SAAD"}	1
487	0126-2001-0455	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAIHAN WIRANU FATURAHMAN A"}	1
488	0126-2001-0456	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAKA AKMAL FALIH RABBANI"}	1
489	0126-2001-0457	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RENSA LINANDA"}	1
490	0126-2001-0458	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "REYNALDO PRATAMA"}	1
491	0126-2001-0459	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LISA GUSTIANI"}	1
492	0126-2001-0460	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "I GUSTI NGURAH TRI NADYARTA"}	1
493	0126-2001-0461	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "EKO WIWIN SETIAWAN"}	1
494	0126-2001-0462	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AMMAR ARYAN NUHA"}	1
495	0126-2001-0463	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HANNA YASMIN EL FATH AL QUDSIH"}	1
496	0126-2001-0464	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FADHIL RACHMAD ZULFIKAR"}	1
497	0126-2001-0465	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ABDUL RAHMAN"}	1
498	0126-2001-0466	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADRIAN PRAYITNA"}	1
499	0126-2001-0467	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AGUNG SURYANSYAH"}	1
500	0126-2001-0468	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AKMAL NUGRAHA FADILAH"}	1
501	0126-2001-0469	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALDI PRASETYO"}	1
502	0126-2001-0470	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALDO ABADI MAKHYUN"}	1
503	0126-2001-0471	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NABILAH AZHAARA"}	1
504	0126-2001-0472	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PUTRI NOVITASARI"}	1
505	0126-2001-0473	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANABEL LEVIA GUSTAMA"}	1
506	0126-2001-0474	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARYA AGAM PRADIKA"}	1
507	0126-2001-0475	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ASHIM KHIYARUL UMMAH"}	1
508	0126-2001-0476	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BALQIS KHUN LATIFA AZZAHRA"}	1
509	0126-2001-0477	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BANGKIT DWIKA VIKTORIA"}	1
510	0126-2001-0478	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HABIBURRAHMAN"}	1
511	0126-2001-0479	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DAVID LOKSA HARTANA SIAHAAN"}	1
512	0126-2001-0480	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DEDEN RIZKY PRATAMA"}	1
513	0126-2001-0481	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DEDY RENALDY"}	1
514	0126-2001-0482	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DEO FITRA"}	1
515	0126-2001-0483	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DHYAH GALUH ANGGITA PUTRI"}	1
516	0126-2001-0484	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DIVA MAULIDA NAJWA"}	1
517	0126-2001-0485	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FAISHAL NUR AMMAR"}	1
518	0126-2001-0486	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FAIZAL PRASETYAWAN"}	1
519	0126-2001-0487	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FANDI MARTA CHANDRA"}	1
520	0126-2001-0488	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FANIA AMALIA PUTRI"}	1
521	0126-2001-0489	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FARHAN ANGGRAITO PRADANA"}	1
522	0126-2001-0490	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FARHAN MUHAMMAD FADILAH"}	1
523	0126-2001-0491	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FEBRY PRADANA"}	1
524	0126-2001-0492	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FERNANDO WONGSO"}	1
525	0126-2001-0493	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AKHMAD FIKRI IKHYA ULUMUDDIN"}	1
526	0126-2001-0494	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GEETA VALENTINA WIDYANINGSIH"}	1
527	0126-2001-0495	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HABIB RIZKI"}	1
528	0126-2001-0496	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HADYAN DWI ARIYANTA"}	1
529	0126-2001-0497	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HAFIZ FITRAH"}	1
530	0126-2001-0498	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HERMAWAN SUSANTO"}	1
531	0126-2001-0499	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HILAL RIZHAQ HUTAMA"}	1
532	0126-2001-0500	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HUSNI WIBOWO"}	1
533	0126-2001-0501	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IGNASHIA PARAMANINDITA RUI HERMIKA"}	1
534	0126-2001-0502	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IKHSANUL LUTFI YULIAWAN"}	1
535	0126-2001-0503	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ILHAM NURHUDA"}	1
536	0126-2001-0504	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HABIB SHOLIKH MARHADIKA"}	1
537	0126-2001-0505	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADHITYA NUGRAHA"}	1
538	0126-2001-0506	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANANDA RIZKY GANDA"}	1
539	0126-2001-0507	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANIQ ROIHAN"}	1
540	0126-2001-0508	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AKHMAD FITRI HARISSANDI"}	1
541	0126-2001-0509	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YUDI P.SIHOTANG"}	1
542	0126-2001-0510	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IBNU SYUHADA"}	1
543	0126-2001-0511	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TRI ADITYA UTAMA"}	1
544	0126-2001-0512	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "VALERINA ARFIANTI"}	1
545	0126-2001-0513	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "XELLA GREAT CHIANO"}	1
546	0126-2001-0514	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YUDI PRASETYO"}	1
547	0126-2001-0515	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ZAKA FADHLILLAH"}	1
548	0126-2001-0516	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMAD ANDRI ARIYANTO"}	1
549	0126-2001-0517	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD HALIM MARTADIONO"}	1
550	0126-2001-0518	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD IHSAN"}	1
551	0126-2001-0519	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUH. IRSYAD ARSY"}	1
552	0126-2001-0520	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IRVAN YOGA PRATAMA"}	1
553	0126-2001-0521	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MOCHAMMAD RAIF JAHFALIANSYAH"}	1
554	0126-2001-0522	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JOSSY SIMANUNGKALIT"}	1
555	0126-2001-0523	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JULIET RIRIS SUKMAHADI"}	1
556	0126-2001-0524	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD SYAIRAZI"}	1
557	0126-2001-0525	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUCH HAFIZH IZZULHAQ"}	1
558	0126-2001-0526	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD NURDIN HASIBUAN"}	1
559	0126-2001-0527	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD RIZKY IWANDA"}	1
560	0126-2001-0528	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMAD AKMAL"}	1
561	0126-2001-0529	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MOHAMAD ALFAT ZULKHIZANI"}	1
562	0126-2001-0530	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD INDRA"}	1
563	0126-2001-0531	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD NASHRUDDIN"}	1
564	0126-2001-0532	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD RAFI"}	1
565	0126-2001-0533	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD KHAIRIL ANWAR"}	1
566	0126-2001-0534	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD NAKHWAH WAFAA AROFAH"}	1
567	0126-2001-0535	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AULYA IFFASARI NABILA"}	1
568	0126-2001-0536	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NUZULUL SRI ATMA"}	1
569	0126-2001-0537	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIZKI"}	1
570	0126-2001-0538	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RACHMATULLAH AGUNG PRIYANTO"}	1
571	0126-2001-0539	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAFIF SHIDQI RAMADHANI"}	1
572	0126-2001-0540	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAHMATIAN ISNINDANI NUR MUSLIM"}	1
573	0126-2001-0541	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAIHAN YUDA ADIPRATAMA"}	1
574	0126-2001-0542	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAKHA ARKANANTA"}	1
575	0126-2001-0543	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RANGGA ADI PRASETYA"}	1
576	0126-2001-0544	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RESTU NURYAHYA"}	1
577	0126-2001-0545	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "REZA ANUGRAH UTAMA"}	1
578	0126-2001-0546	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SARAH AMELIA NURUL IZZATI"}	1
579	0126-2001-0547	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SUPRIONO"}	1
580	0126-2001-0548	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TIO DWI SYAHPUTRA"}	1
581	0126-2001-0549	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD RIZKY VAHLEVY"}	1
582	0126-2001-0550	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "VANNY PUTRI JAYANTI"}	1
583	0126-2001-0551	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SAFIRA RIZKI AHSANIA"}	1
584	0126-2001-0552	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DHYAA NANDA PUSPITA"}	1
585	0126-2001-0553	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARDINA IKE SAFITRI"}	1
586	0126-2001-0554	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BUNGA PRIMA SARI"}	1
587	0126-2001-0555	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TRISNA MEGA FLAUFILLIA"}	1
588	0126-2001-0556	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALFINA DAMAYANTI"}	1
589	0126-2001-0557	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "VILANA NOVIA KHOIRRAHMAWATI"}	1
590	0126-2001-0558	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DZIKRA AZ ZAHRI GUNAWAN"}	1
591	0126-2001-0559	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ELFINA ANGGRAINI"}	1
592	0126-2001-0560	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ELGA AMBAR AMANDA"}	1
593	0126-2001-0561	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FATIYYA HAYYU ATSARI"}	1
594	0126-2001-0562	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FEBRIYANI DIAH PURWANTI"}	1
595	0126-2001-0563	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FENIA BUDI WIJAYA"}	1
596	0126-2001-0564	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FIDELA ZAYYAN NABILA"}	1
597	0126-2001-0565	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GALUH DINIE SARIMALA"}	1
598	0126-2001-0566	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GRACE INTAN Y S"}	1
599	0126-2001-0567	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HANA SALSABILAH MAHARANI"}	1
600	0126-2001-0568	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HAIRUNNISA SALSABILA"}	1
601	0126-2001-0569	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IMA RULITA SARI"}	1
602	0126-2001-0570	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "INDRI RIZKY YUSPITA PUTRI"}	1
603	0126-2001-0571	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "INGRID RISNAULI MEGAWATI"}	1
604	0126-2001-0572	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IRAWATI PUTRI LUMBAN GAOL"}	1
605	0126-2001-0573	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IRNADYANIS ESTRI UTAMI"}	1
606	0126-2001-0574	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANNA MARIA MAHA RANI"}	1
607	0126-2001-0575	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANITA SARI"}	1
608	0126-2001-0576	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HASNA KHANSA SILLA ANDRAINI"}	1
609	0126-2001-0577	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SUKMA AYU ANGGRAENI"}	1
610	0126-2001-0578	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TASYA NUR HALIZA"}	1
611	0126-2001-0579	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SAVIRA CAHYANISSA"}	1
612	0126-2001-0580	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KHADIJAH DENIAR ARHAM"}	1
613	0126-2001-0581	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KHOIRUNISA PUTRI SALSABIL"}	1
614	0126-2001-0582	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KHOZIZAH DWI VITASARI"}	1
615	0126-2001-0583	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LILIS DWI NINGKRUM"}	1
616	0126-2001-0584	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "VISKA LORA"}	1
617	0126-2001-0585	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MAULIDA HANIN NISA"}	1
618	0126-2001-0586	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MAYANG LAVECCHIA SIGNORA"}	1
619	0126-2001-0587	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MIRA SILVIA HUTABARAT"}	1
620	0126-2001-0588	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUTHIA ALYA WINDIKA"}	1
621	0126-2001-0589	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUTIARA RAHMA FADHILA"}	1
622	0126-2001-0590	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NABILA PUTRI DEVAMA"}	1
623	0126-2001-0591	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "VEREN QORIDHA NAFASYA"}	1
624	0126-2001-0592	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NAJAH"}	1
625	0126-2001-0593	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MARIA YOSEPHINE NAKITA PUTRI"}	1
626	0126-2001-0594	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NAMIRA NANDINI"}	1
627	0126-2001-0595	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NAOMIA SINDHU SIWI"}	1
628	0126-2001-0596	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NADHIFA AQILATUL HAFSHOH"}	1
629	0126-2001-0597	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NASHWA AARIFAH ZAHRA"}	1
630	0126-2001-0598	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NASYWA ALYA DEYNA"}	1
631	0126-2001-0599	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NOVI SUSANTI"}	1
632	0126-2001-0600	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NOVIYONA BR SURBAKTI"}	1
633	0126-2001-0601	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NURAINI"}	1
634	0126-2001-0602	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NUR ANNISA"}	1
635	0126-2001-0603	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RESSA NUR ANNISA"}	1
636	0126-2001-0604	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "OGAN NISA LAELA BAHA ALDILA"}	1
637	0126-2001-0605	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PUTRI NURRIZKI SEPTIANA"}	1
638	0126-2001-0606	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PURI ANDINI"}	1
639	0126-2001-0607	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PUTRI FADHILA"}	1
640	0126-2001-0608	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAHMI AZIZAH"}	1
641	0126-2001-0609	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RANINDHEA NAVISA OKTASAVIRA"}	1
642	0126-2001-0610	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RISA GABRIELLA FLORENTINA"}	1
643	0126-2001-0611	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RISKA MARTA PRATIWI"}	1
644	0126-2001-0612	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ROHMULIAKASIH SIMAREMARE"}	1
645	0126-2001-0613	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SALMA LUTHFIA"}	1
646	0126-2001-0614	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SHIFA KOMALA HAPSARI"}	1
647	0126-2001-0615	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SISKA AYU HAPSARI"}	1
648	0126-2001-0616	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SISWANTI HANDAYANI"}	1
649	0126-2001-0617	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SITI SARAH BILQIST"}	1
650	0126-2001-0618	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SITI YULIA FAISAL"}	1
651	0126-2001-0619	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SYAHRA MEIDIVA RIYANTO"}	1
652	0126-2001-0620	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SUCI ZERLINA ELVITA NAOMI"}	1
653	0126-2001-0621	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SUTRI YANI"}	1
654	0126-2001-0622	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SYAFIRA YUANITA WAKHDA"}	1
655	0126-2001-0623	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SYAQY PERMATA FADILAH"}	1
656	0126-2001-0624	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TALIDHA YUMNA SYIFA"}	1
657	0126-2001-0625	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "THERESIA DELIANA PUTRI"}	1
658	0126-2001-0626	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TRIAS ZAHRAA PUTRI"}	1
659	0126-2001-0627	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "WAFIN AFIFAH TAGHSYA"}	1
660	0126-2001-0628	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "WAHIDA MUNTAZA WIBAWANI"}	1
661	0126-2001-0629	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "WEDNIS DWI DIANIK"}	1
662	0126-2001-0630	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YELSA HANIFAH ARDIN"}	1
663	0126-2001-0631	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ZAHRATUL AINI"}	1
664	0126-2001-0632	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ZANDIA MARETHA PUTRI"}	1
665	0126-2001-0633	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ZAHRA ROZANA KAUTSAR"}	1
666	0126-2001-0634	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALMIRA MELITA PERMATA RAMADHAN"}	1
667	0126-2001-0635	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NISRINA ANINDYA DESVIANTY"}	1
668	0126-2001-0636	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANIS SOFIYAH"}	1
669	0126-2001-0637	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "APRILLIA DEWI BRIAS ALMA"}	1
670	0126-2001-0638	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NOOR ATHIEA RAHMAWATIE"}	1
671	0126-2001-0639	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AZZAHRA TSYANIA BALIARTO"}	1
672	0126-2001-0640	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DINI NASYA AMINI"}	1
673	0126-2001-0641	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NOVIERA ELLSEN"}	1
674	0126-2001-0642	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ERIKA LARASATI FAJRINA"}	1
675	0126-2001-0643	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FARAH RAHMATIKA"}	1
676	0126-2001-0644	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FIRDA AULYA NISA"}	1
677	0126-2001-0645	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IRFANITA NURHIDAYAH HASAN"}	1
678	0126-2001-0646	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JESICA F. MANURUNG"}	1
679	0126-2001-0647	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KANYA DUIARIZKE MAULIDIA"}	1
680	0126-2001-0648	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KYLA ALMIRA"}	1
681	0126-2001-0649	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MARETHA RACHMA BHINTARI"}	1
682	0126-2001-0650	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALISHA MAULIDITA"}	1
683	0126-2001-0651	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "OLVIONA REDITA"}	1
684	0126-2001-0652	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PATRICYA NAOMI"}	1
685	0126-2001-0653	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PUPUT MUTMAINNAH"}	1
686	0126-2001-0654	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARIMBI PUSPITADEWI PUTRI MAHARANI SUJONO"}	1
687	0126-2001-0655	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PUTRI SALSABILA YULITA"}	1
688	0126-2001-0656	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAHMATIKA AL AUTSINA"}	1
689	0126-2001-0657	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIFA AZZAHRA PUTRI"}	1
690	0126-2001-0658	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SYIFA FACHRINDA"}	1
691	0126-2001-0659	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SRI ENDARTI"}	1
692	0126-2001-0660	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "STELLA MARIA LOYWEA"}	1
693	0126-2001-0661	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TARISYA SYAULA ZAHRA"}	1
694	0126-2001-0662	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TIRZA ILLONA KURNIADI"}	1
695	0126-2001-0663	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "WINDA THERESIA SIRAIT"}	1
696	0126-2001-0664	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ZAHWA RIAN KESUMA"}	1
697	0126-2001-0665	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALYA NUR HALIZA"}	1
698	0126-2001-0666	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ZAHWA PUTRI AL ZIZA"}	1
699	0126-2001-0667	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "CYNTYA NAOMI BINROOS SIREGAR"}	1
700	0126-2001-0668	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DHEA MARSYANDA LAILATUL MUJIZAT NP"}	1
701	0126-2001-0669	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FARA ZAMETHA ELSA RESKI"}	1
702	0126-2001-0670	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HANNAH CHRISSANTY"}	1
703	0126-2001-0671	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IRENETTA BORU SILALAHI"}	1
704	0126-2001-0672	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LARISSA HASIAN"}	1
705	0126-2001-0673	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MAHARANI DINILISTRISIANA"}	1
706	0126-2001-0674	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NABILLA DWI PUTRI"}	1
707	0126-2001-0675	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RATIH CHESARA"}	1
708	0126-2001-0676	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JATHU RIANTI"}	1
709	0126-2001-0677	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SETIA DWININGSIH"}	1
710	0126-2001-0678	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "VANDYA AULIA AZZAHRA CHANDRADEVI"}	1
711	0126-2001-0679	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ZAIZAFUN ZAHRA"}	1
712	0126-2001-0680	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADINDA DIANINGTYAS PUTRI SALSABILA"}	1
713	0126-2001-0681	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADINTA AYU MUTIA BANGUN"}	1
714	0126-2001-0682	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FARAH AFADA ZAHRA"}	1
715	0126-2001-0683	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AIDAH KHANSA FAHNIAR"}	1
716	0126-2001-0684	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AISYAH DIVA SYAIRA"}	1
717	0126-2001-0685	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AKMALINA FADHILAH YAHYA"}	1
718	0126-2001-0686	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANDHINI CHINDY ARTIKA"}	1
719	0126-2001-0687	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANNIDA RAHMAH"}	1
720	0126-2001-0688	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANNISA FIRDAUS NST"}	1
721	0126-2001-0689	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AUDI DIVA ALTEZZA"}	1
722	0126-2001-0690	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AULIA ISNAENI ZAHRA"}	1
723	0126-2001-0691	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AULIA NOVITA ANINDITA"}	1
724	0126-2001-0692	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "CHINDY ROSITA DEWI"}	1
725	0126-2001-0693	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HILDA ADRIANA INDRA"}	1
726	0126-2001-0694	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ELZA MUTHIA SEPTANTI"}	1
727	0126-2001-0695	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FADILATUL JENNAH"}	1
728	0126-2001-0696	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FANZA AUDIARY PUTRI"}	1
729	0126-2001-0697	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FIRDHA NURHIKMAH"}	1
730	0126-2001-0698	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FITRIA RACHMAWATI"}	1
731	0126-2001-0699	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FRISTA KHAULANABILA ADINA PUTRI"}	1
732	0126-2001-0700	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GHEACINTA AUDREY RITONGA"}	1
733	0126-2001-0701	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HANA YULLYA NURHUDA"}	1
734	0126-2001-0702	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ISMA SYAWLA LAZUARDY"}	1
735	0126-2001-0703	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IZZAH LUXFIATI"}	1
736	0126-2001-0704	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JUWITA LESTARI"}	1
737	0126-2001-0705	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KADEK IMELDA ANINDRA ERASWATI"}	1
738	0126-2001-0706	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KHOIRIYAH PUTRI HARDIYANTI"}	1
739	0126-2001-0707	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "VERONICA KIRANA NARISWARI PASKAHLIS WIJAYANTO"}	1
740	0126-2001-0708	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KIRANA VELINDITA"}	1
741	0126-2001-0709	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LUTFIAH INDAH RIZKI"}	1
742	0126-2001-0710	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MERLYNDA EFRILIANI"}	1
743	0126-2001-0711	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD WILDAN"}	1
744	0126-2001-0712	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NABILA SHILMI KAFFAH"}	1
745	0126-2001-0713	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NANDA DINI EKA SYAH PUTRI"}	1
746	0126-2001-0714	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NESYA REYNALDA HANDOKO"}	1
747	0126-2001-0715	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "WAYAN NICITHYA DHARINIDEVI"}	1
748	0126-2001-0716	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RADEN RARA NISWARACITTA INTAR DIWASASRI"}	1
749	0126-2001-0717	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NOVISDA DWI RACHMADINI"}	1
750	0126-2001-0718	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NUR ANGGRAENI WULANNDARI"}	1
751	0126-2001-0719	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PUSPITA GALIH PRAMESTHI"}	1
752	0126-2001-0720	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIDA AYU SURYA PUTRI"}	1
753	0126-2001-0721	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIEKE PUTRI PRATAMA"}	1
754	0126-2001-0722	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIZKI INDRASARI RAMADHANI"}	1
755	0126-2001-0723	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIZMA DRAJAD SITI APRIYANTI"}	1
756	0126-2001-0724	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RUTH TARULI STEPHANI RAJAGUKGUK"}	1
757	0126-2001-0725	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SAFFANA SITTA KAMILA"}	1
758	0126-2001-0726	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SALMA SALIMAH"}	1
759	0126-2001-0727	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IFTITAH SALSABILLA AHMAD"}	1
760	0126-2001-0728	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SALSABILA THANESYA PUTRI"}	1
761	0126-2001-0729	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SALSABILA RISKY WAHYU TRIANDANI"}	1
762	0126-2001-0730	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "STEFANI AVELLIANA MEGARANTI"}	1
763	0126-2001-0731	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "STELLA ALDORA DEVI PERMATAHATI"}	1
764	0126-2001-0732	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TIFANY PERANGIN ANGIN"}	1
765	0126-2001-0733	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ZAHRA SAVINA PURNOMO PUTRI"}	1
766	0126-2001-0734	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ZAHRATUNNISA"}	1
767	0126-2001-0735	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ABIDA ZULIRA IRFANI"}	1
768	0126-2001-0736	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADIFA RAHMANDINI"}	1
769	0126-2001-0737	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADILLA CINDY JONFITA"}	1
770	0126-2001-0738	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADZROO YUMNA QURROTU&#039;AINI"}	1
771	0126-2001-0739	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AURELIA AERON SABRINE GAINA"}	1
772	0126-2001-0740	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AISYA MAYESTI KHOLIZA"}	1
773	0126-2001-0741	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALDIVA NATASYA PUTRI SHALSABILA"}	1
774	0126-2001-0742	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALIFAH SYAFAA NABILA"}	1
775	0126-2001-0743	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALINDA ARTA LOKA"}	1
776	0126-2001-0744	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALLYSA MAHARANI SURYANINGTIAS"}	1
777	0126-2001-0745	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AMALIKA WIDIYANTI"}	1
778	0126-2001-0746	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AMANDA FILIA TERIA"}	1
779	0126-2001-0747	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AMIRAH ZALFA ARINDYA"}	1
780	0126-2001-0748	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AMANAH HAMIDAH"}	1
781	0126-2001-0749	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANDREA MONICA SARI"}	1
782	0126-2001-0750	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANADA SAFARA"}	1
783	0126-2001-0751	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANASTASIA LIDYA KUSUMANINGTYAS"}	1
784	0126-2001-0752	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANGRE INA LAROSE SIHOTANG"}	1
785	0126-2001-0753	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANIK DIAN INSANI"}	1
786	0126-2001-0754	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANINDA REHANI PRASISTANTI"}	1
787	0126-2001-0755	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANISA FEBRIANTI RACHMADANI"}	1
788	0126-2001-0756	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANISAH AMINI"}	1
789	0126-2001-0757	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANISA RAHMIARTI"}	1
790	0126-2001-0758	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GITA ANUGRAHING RAHAYU"}	1
791	0126-2001-0759	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARIFAH NUR WARDAH"}	1
792	0126-2001-0760	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARISTA WINDI UTAMI"}	1
793	0126-2001-0761	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARRUM PUSPITASARI"}	1
794	0126-2001-0762	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARUMING KUSUMA MAWARNI"}	1
795	0126-2001-0763	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ASSYA PUTRI RAHMADANI"}	1
796	0126-2001-0764	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ASWITA MAHARANI ARDIANINGSIH"}	1
797	0126-2001-0765	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ATIKAH MUNA"}	1
798	0126-2001-0766	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AULIA ANUGERAH PUTRI"}	1
799	0126-2001-0767	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AYESHA PUTRI MAHARANI"}	1
800	0126-2001-0768	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AZAA KAMALIA"}	1
801	0126-2001-0769	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BERLIANA DWI ARTHANTI"}	1
802	0126-2001-0770	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BERLIAN ZAHRA ARWAA"}	1
803	0126-2001-0771	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "CANISSA MAHARANI"}	1
804	0126-2001-0772	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AZELI ANOM"}	1
805	0126-2001-0773	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "CELINA ALESSANDRA"}	1
806	0126-2001-0774	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "CHYNTIA LEONY ANGELINA"}	1
807	0126-2001-0775	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DACHILATA JANNATA"}	1
808	0126-2001-0776	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DAVINA JASMINE REISHA IRAWAN"}	1
809	0126-2001-0777	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DEBY ANGGREANI MANALU"}	1
810	0126-2001-0778	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DESTRIA REVANA"}	1
811	0126-2001-0779	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DEVANY CHOIRUNISA"}	1
812	0126-2001-0780	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DIANDRA ADRISTIARA"}	1
813	0126-2001-0781	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FATH DIENE YUSLIMA HANDARUAN"}	1
814	0126-2001-0782	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DINY ANGGITA SIWI"}	1
815	0126-2001-0783	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DEWI MASYITHA ARTHA"}	1
816	0126-2001-0784	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DWI SIHOL MARITO"}	1
817	0126-2001-0785	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DYAH ELMAWATI SUTANTRI"}	1
818	0126-2001-0786	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ERSA MUTIA JAYA SASKI"}	1
819	0126-2001-0787	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ENDRI RAHMAWATI"}	1
820	0126-2001-0788	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ETIKA SARI"}	1
821	0126-2001-0789	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FAUZIA AMALIA"}	1
822	0126-2001-0790	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FATHARANI DHIYA ATHIFAH"}	1
823	0126-2001-0791	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FATWAL ISLAMIATY"}	1
824	0126-2001-0792	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FAUZIA BILQIS IZZATI"}	1
825	0126-2001-0793	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FIRDHA AZKIA"}	1
826	0126-2001-0794	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FLORA AYU RAHMA DEWI"}	1
827	0126-2001-0795	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "CORNELIA GIFTY WARDOYO"}	1
828	0126-2001-0796	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GINA NURAPRILIYANTI"}	1
829	0126-2001-0797	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GITA WAHYU RAMADHANI"}	1
830	0126-2001-0798	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GRISHAFA ANGGITA ERDIYASA"}	1
831	0126-2001-0799	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BERNADETTE THERESIA AVILA JEANITA SECHTISIMA"}	1
832	0126-2001-0800	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NILNA FAROH"}	1
833	0126-2001-0801	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FEBRIANA PUJA ANGGRITA"}	1
834	0126-2001-0802	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PUTRI AZZAHRA SALSABILA"}	1
835	0126-2001-0803	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FANI RAHMAH LATIFAH"}	1
836	0126-2001-0804	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AFIFAH SALSAH SAFIQAH"}	1
837	0126-2001-0805	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "EMA SARILA SINAGA"}	1
838	0126-2001-0806	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "CINTA SHERINA ADHYAKSA SIAGIAN"}	1
839	0126-2001-0807	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SYIFA AZZAHRA"}	1
840	0126-2001-0808	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "EGYDIA VANYA VYOMOZHA"}	1
841	0126-2001-0809	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "APRISKA WIDIANGELA"}	1
842	0126-2001-0810	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "WINA SHELA"}	1
843	0126-2001-0811	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANISA PUTRI WULANDARI"}	1
844	0126-2001-0812	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MONALISA INDAH RONAULI"}	1
845	0126-2001-0813	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PRIMALISRI GRAHADHIANI GHINAATHURFAH"}	1
846	0126-2001-0814	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SINDY MERIAHNI AMELIA"}	1
847	0126-2001-0815	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NUR HASANAH ARIYANTI"}	1
848	0126-2001-0816	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HANIFAH FEBRI ANNISA"}	1
849	0126-2001-0817	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HONEST MUSLIMAH"}	1
850	0126-2001-0818	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NUR INDAH SETRINA"}	1
851	0126-2001-0819	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "INDIRA RAMADHANI LISYANTO"}	1
852	0126-2001-0820	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ISNA VEVIATI"}	1
853	0126-2001-0821	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JAUZA MARWA SALSABILA"}	1
854	0126-2001-0822	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JANNATUL MAIYAH"}	1
855	0126-2001-0823	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JULASTRI DWI RIZKI"}	1
856	0126-2001-0824	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KARIN KHAIRUNNISA KUSNANDAR"}	1
857	0126-2001-0825	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KASHIBU T. A. SINAMBELA"}	1
858	0126-2001-0826	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KHALDA ALIFIA AZZAHRA"}	1
859	0126-2001-0827	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KHALILA ZIFA ALIFIA"}	1
860	0126-2001-0828	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KHARISMA ANNISA DYAH ISNANDAR"}	1
861	0126-2001-0829	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KIMI BULAN RUMONDANG SIANIPAR"}	1
862	0126-2001-0830	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LARAS NADA DOA"}	1
863	0126-2001-0831	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LARISA NALA OCTAVIA"}	1
864	0126-2001-0832	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LIDYA LANTIKA"}	1
865	0126-2001-0833	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LESTARI WAHYU IKHSANI"}	1
866	0126-2001-0834	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MALIKA ADVENTITA HUTAPEA"}	1
867	0126-2001-0835	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MARCAYLA RAHMA SANTOSO"}	1
868	0126-2001-0836	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SALSABILA MAULY JUNAIDI"}	1
869	0126-2001-0837	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NABILA ANINDHITA ANWAR"}	1
870	0126-2001-0838	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NABILLA RAHMADINA HARIYANTI"}	1
871	0126-2001-0839	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NADILA DWI SYAFIRA"}	1
872	0126-2001-0840	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NAJWA ALIFIA AZ ZAHRA"}	1
873	0126-2001-0841	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NARA DISNA HUMANIDYA"}	1
874	0126-2001-0842	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NICSA SOLVANI PUTRI"}	1
875	0126-2001-0843	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NOVENTASYA NIDYA MEGASAFITRI"}	1
876	0126-2001-0844	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NUR FITRIANI"}	1
877	0126-2001-0845	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NUR REGIA PUTRI UTAMA"}	1
878	0126-2001-0846	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NUR SETYOWATI"}	1
879	0126-2001-0847	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NUR SIFA DEFIANI"}	1
880	0126-2001-0848	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NURUL IRFANI ZAKIYA"}	1
881	0126-2001-0849	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "OKTARINA PUTRI ASHARI"}	1
882	0126-2001-0850	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SANTI PARAPAT"}	1
883	0126-2001-0851	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PRAMUDITA NURATRI RUSMONOPUTRI"}	1
884	0126-2001-0852	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PRISEILA VANIA MAHARANI"}	1
885	0126-2001-0853	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "QATHRUNNADA"}	1
886	0126-2001-0854	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "QUEEN AISYAH PRIMARINI"}	1
887	0126-2001-0855	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIFQAH ANISA HENI NASUTION"}	1
888	0126-2001-0856	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SILVIA ZE RANI BR SITEPU"}	1
889	0126-2001-0857	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MAUDY RATU AULIA"}	1
890	0126-2001-0858	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "REBECCA PURBA"}	1
891	0126-2001-0859	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "REISA ZERLINA MAHARANI RIADY"}	1
892	0126-2001-0860	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RETMA RAHMA VERANI"}	1
893	0126-2001-0861	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "REYKA AGUSTINA SABIR"}	1
894	0126-2001-0862	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RHEINA SANIYYA RAHMAYANTI"}	1
895	0126-2001-0863	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ROMADO"}	1
896	0126-2001-0864	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RISKA DIAN NADILLA"}	1
897	0126-2001-0865	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIZKA CHAIRUNNISA"}	1
898	0126-2001-0866	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RUTH DEBORA NATALIA ANGELICA"}	1
899	0126-2001-0867	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RUT KRISNATALYANTI SIHITE"}	1
900	0126-2001-0868	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SABNUR PRADNYA PARAMITHA"}	1
901	0126-2001-0869	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SADYA MAYACKYANO YANY"}	1
902	0126-2001-0870	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SEKAR NUR HALIMAH"}	1
903	0126-2001-0871	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SEKAR SARI SYAHARANI"}	1
904	0126-2001-0872	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SELSARIA INDAH UTAMI"}	1
905	0126-2001-0873	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SERLY WIDAYANTI"}	1
906	0126-2001-0874	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SHAFIYA AZIZAH"}	1
907	0126-2001-0875	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SHAHNAZ NUR BERLIANI"}	1
908	0126-2001-0876	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SHAILA FITRI HASYIM NASUTION"}	1
909	0126-2001-0877	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SHAINA AQILLA"}	1
910	0126-2001-0878	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SILVIRA ROSSA ISVANDRYA"}	1
911	0126-2001-0879	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "REGETTA RIYANTI"}	1
912	0126-2001-0880	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TASYA ALIYYAH SETIORINI"}	1
913	0126-2001-0881	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SYLVIA ANNISA PERBOWO"}	1
914	0126-2001-0882	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SITI MAHMUDA"}	1
915	0126-2001-0883	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SUDESTRI HARDINI"}	1
916	0126-2001-0884	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SYIFA KHAIRUNNISA"}	1
917	0126-2001-0885	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SYIFA RAISA NURINSANI"}	1
918	0126-2001-0886	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TAMIA ANANDA WIDORI"}	1
919	0126-2001-0887	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TARISA RAUDATUL JANNAH"}	1
920	0126-2001-0888	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "THERESSA LADY CORNELIA BR PANJAITAN"}	1
921	0126-2001-0889	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "THIFAL ANJANI"}	1
922	0126-2001-0890	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TIARA SEKAR MELATI"}	1
923	0126-2001-0891	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TIEN TIS’AINI LATIFAH"}	1
924	0126-2001-0892	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TRACHEL FRAGMA SARI"}	1
925	0126-2001-0893	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "WAHDAH ROSALINA LILLAH"}	1
926	0126-2001-0894	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "WARAPSARA CANDRADITYA"}	1
927	0126-2001-0895	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ZARNI YUDIA"}	1
928	0126-2001-0896	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ZAHRA SARTIKA"}	1
929	0126-2001-0897	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SITI ARIQAH BAKRI"}	1
930	0126-2001-0898	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MAHAMERU BAYU BAJRA"}	1
931	0126-2001-0899	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GHALY FAHRIAN ILYAS"}	1
932	0126-2001-0900	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUH. HAEKAL FEBRIAN"}	1
933	0126-2001-0901	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAFI AL FAUZI"}	1
934	0126-2001-0902	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD REZA MAULANA NASUTION"}	1
935	0126-2001-0903	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD THORIQ ARKAAN SUSILA"}	1
936	0126-2001-0904	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ROBINTANG S. SITUMORANG"}	1
937	0126-2001-0905	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FADHIL RAYHAN SYAPUTRA"}	1
938	0126-2001-0906	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BIMABARA SUKMA MURYANTO"}	1
939	0126-2001-0907	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD FATWA FARHANTO"}	1
940	0126-2001-0908	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD HAIKAL GHIFARY NASUTION"}	1
941	0126-2001-0909	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SAMUEL TOBIT OHIRO"}	1
942	0126-2001-0910	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TIMOTHY MARTUA SIMBOLON"}	1
943	0126-2001-0911	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ZAKI RABBANI RIADY PUTRA"}	1
944	0126-2001-0912	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NAUFAL GHIFARI"}	1
945	0126-2001-0913	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AULIA EFANDA NINGRUM"}	1
946	0126-2001-0914	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DIMAS FERDIANSYAH BAGUS PAMUNGKAS"}	1
947	0126-2001-0915	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DINI ARIFANI"}	1
948	0126-2001-0916	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FITRIANI SUKRI"}	1
949	0126-2001-0917	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HENI SINTIA"}	1
950	0126-2001-0918	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAHMI ERSALINA"}	1
951	0126-2001-0919	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RANGGA DEWA TRIANA"}	1
952	0126-2001-0920	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALIFAH AGUSTIA TRIHAPSARI"}	1
953	0126-2001-0921	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NI KOMANG CHINVYA MEYNDRA"}	1
954	0126-2001-0922	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KOMANG AYU PUTRI WARDANI"}	1
955	0126-2001-0923	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KISTI IZZATA KIREINA"}	1
956	0126-2001-0924	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DWYPUTRI NURMUHARAENI SUKIRMAN"}	1
957	0126-2001-0925	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PUTRI MAHIRA ADELIA"}	1
958	0126-2001-0926	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "REZKI WULANDARI"}	1
959	0126-2001-0927	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TALSA FANI"}	1
960	0126-2001-0928	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NOORA ALFATIHAH"}	1
961	0126-2001-0929	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AUDRI ADELIA YUNINDA"}	1
962	0126-2001-0930	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GODELIVA BRILIANI JASINTA NGALA"}	1
963	0126-2001-0931	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NI PUTU MELIANI"}	1
964	0126-2001-0932	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PUJA ARSITAH"}	1
965	0126-2001-0933	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "INTAN BR PANGGABEAN"}	1
966	0126-2001-0934	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALGRACYA RIBKA MARLINA"}	1
967	0126-2001-0935	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KHAIRA UMMA TAMBUNAN"}	1
968	0126-2001-0936	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD RANDY AL-FARIZY"}	1
969	0126-2001-0937	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUTIARA AINI"}	1
970	0126-2001-0938	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NAZWA HARISYA LUTHFI"}	1
971	0126-2001-0939	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MOHAMMAD RAIS"}	1
972	0126-2001-0940	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AZZAHRI MUNAWWAROH"}	1
973	0126-2001-0941	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "CHARYUNITA Y SIMANJUNTAK"}	1
974	0126-2001-0942	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RISKI TRIANDA"}	1
975	0126-2001-0943	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NURUL AZMI"}	1
976	0126-2001-0944	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RISMANELIA"}	1
977	0126-2001-0945	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DINDA SUKRA ALHAMDA"}	1
978	0126-2001-0946	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ZAHARA RIZKIA"}	1
979	0126-2001-0947	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "EDWIN JASTIN"}	1
980	0126-2001-0948	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DIAZ FIRMANSYAH"}	1
981	0126-2001-0949	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GADING JUNIAR SAYYIDINA"}	1
982	0126-2001-0950	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "CAHYA ANANTA G"}	1
983	0126-2001-0951	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GROVANTI NATA KIYANSARI SUBAGYO"}	1
984	0126-2001-0952	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KANAYA AZZAHRA RAMAQILA AURINTA"}	1
985	0126-2001-0953	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AWALIA SHAQUILLE LIO"}	1
986	0126-2001-0954	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PUTRI SABRINA"}	1
987	0126-2001-0955	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "CHAYANI NOVELINA TAMBA"}	1
988	0126-2001-0956	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GUMILANG ATRAWIBAWA"}	1
989	0126-2001-0957	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "CEMPAKA NABILLA"}	1
990	0126-2001-0958	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DWINDA DAMAYENTI"}	1
991	0126-2001-0959	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD FAISAL NUGRAHA"}	1
1109	0126-2001-1077	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALFITO KRESNO"}	1
992	0126-2001-0960	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RHADA OKTARISELLA"}	1
993	0126-2001-0961	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DEBBY CARNESA"}	1
994	0126-2001-0962	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LUHUR SETIAJI"}	1
995	0126-2001-0963	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TEMY AULIYATI"}	1
996	0126-2001-0964	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARI KUSWANDARI"}	1
997	0126-2001-0965	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PRADNYA LUH TABITA"}	1
998	0126-2001-0966	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMAD DAVA PUTRA PRAYOGA"}	1
999	0126-2001-0967	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAFLI ZAKY"}	1
1000	0126-2001-0968	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD RIZQI ANANDA"}	1
1001	0126-2001-0969	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SALSABILA ADDINA SALWA"}	1
1002	0126-2001-0970	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NUR ADITIYA PARAMITA"}	1
1003	0126-2001-0971	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADDIN YALQA QINTHARA"}	1
1004	0126-2001-0972	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "A. DANI IRSYAH"}	1
1005	0126-2001-0973	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AHMAD LUPILA NASUTION"}	1
1006	0126-2001-0974	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AHMAD MISMARUL ALAM"}	1
1007	0126-2001-0975	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AIDIL FITRIANSYAH"}	1
1008	0126-2001-0976	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALAM ABDUL ROJAK"}	1
1009	0126-2001-0977	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALDI PRATAMA"}	1
1010	0126-2001-0978	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANGGUN WAHYU TRICAHYO"}	1
1011	0126-2001-0979	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "APRILLIA BUDI FADLILAH"}	1
1012	0126-2001-0980	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARFIE ANANSYAH PRAKOSO"}	1
1013	0126-2001-0981	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARHAM MAULANA"}	1
1014	0126-2001-0982	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "I MADE RAI ARI SWABAWA"}	1
1015	0126-2001-0983	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARVIN KASOOR"}	1
1016	0126-2001-0984	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARYAN KHALIK"}	1
1017	0126-2001-0985	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARYA YOGHA PRATAMA ROSADI"}	1
1018	0126-2001-0986	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IBNU ATHAILLAH"}	1
1019	0126-2001-0987	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AKHMAD AZHARI"}	1
1020	0126-2001-0988	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DIMAS NOFRIANSYAH"}	1
1021	0126-2001-0989	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DWI RISKI ARIYANTI"}	1
1022	0126-2001-0990	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FARHAN AKBAR RAHMATULLAH"}	1
1023	0126-2001-0991	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ACHMAD FITRA RAMADHAN"}	1
1024	0126-2001-0992	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ISLAMUL IKHSAN"}	1
1025	0126-2001-0993	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JANUARDI P NABABAN"}	1
1026	0126-2001-0994	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FAJAR PERDAMAIAN"}	1
1027	0126-2001-0995	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "WAHYU RAJA WIJAYA"}	1
1028	0126-2001-0996	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "I GEDE SEMARABAWA"}	1
1029	0126-2001-0997	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "WAHYU AL AKBAR"}	1
1030	0126-2001-0998	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YOGI LIMBONG"}	1
1031	0126-2001-0999	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YOGI PRATAMA"}	1
1032	0126-2001-1000	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YUDI FILEMON NATANIEL NABABAN"}	1
1033	0126-2001-1001	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YUSUF KHADAFI FADLI"}	1
1034	0126-2001-1002	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AHMAD ZIDAN ARRASYID"}	1
1035	0126-2001-1003	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD MIFTAH FAARIS SUTIADI"}	1
1036	0126-2001-1004	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M. FADLY DEVKHA PRATAMA"}	1
1037	0126-2001-1005	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M. ARKAAN FAWWAZ ZAIDAN"}	1
1038	0126-2001-1006	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIFQI ANIQ TAUFIQURROHMAN"}	1
1039	0126-2001-1007	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KEVIN OTDA LUBIS"}	1
1040	0126-2001-1008	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MADE PRAMUDITA SAPUTRA"}	1
1041	0126-2001-1009	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD CHUSNI FERDIANSYAH"}	1
1042	0126-2001-1010	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M. HARDYANZA RAMADHAN"}	1
1043	0126-2001-1011	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD RAQIN"}	1
1044	0126-2001-1012	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD ARYA PUTRA"}	1
1045	0126-2001-1013	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD MAULADAVA ARIEYUSTA"}	1
1046	0126-2001-1014	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD RIZAL MUTAQIEN"}	1
1047	0126-2001-1015	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUZAQI ILHAM"}	1
1048	0126-2001-1016	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NAUFAL IKBAR"}	1
1049	0126-2001-1017	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RADITYA KUSUMA DEWA"}	1
1050	0126-2001-1018	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD RAFI ADITYA FAREL"}	1
1051	0126-2001-1019	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAFLY HAFIZH IRSYAD SYAH PUTRA"}	1
1052	0126-2001-1020	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMAD RESTU DICKY PRATOMO"}	1
1053	0126-2001-1021	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "REZA ARDIANSYAH"}	1
1054	0126-2001-1022	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIDWAN HANAFI"}	1
1055	0126-2001-1023	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIFKY MAULANA"}	1
1056	0126-2001-1024	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIVAN ARIEF FIRMANSYAH"}	1
1057	0126-2001-1025	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD RIZALDI KUNCORO"}	1
1058	0126-2001-1026	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIZAQ FAIDHUL HISAN"}	1
1059	0126-2001-1027	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIZKY DWIANTO"}	1
1060	0126-2001-1028	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ROMEO ARYAPUTRA"}	1
1061	0126-2001-1029	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SHAQUILLE ARDITYA IHSAN"}	1
1062	0126-2001-1030	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M. SOLIHIN ZHAKI"}	1
1063	0126-2001-1031	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "VIORI AFRIANTO"}	1
1064	0126-2001-1032	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ABDILLAH NASHIKH ULWAN"}	1
1065	0126-2001-1033	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALDI PASCAGAMA NURRACHMAN"}	1
1066	0126-2001-1034	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANDIKA SEBASTIAN"}	1
1067	0126-2001-1035	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANGGARAKSA SAFARA WIDYADHANA TOMRIDJO"}	1
1068	0126-2001-1036	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M. ARAFAT ZAIDANI"}	1
1069	0126-2001-1037	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARI MUSTOFA"}	1
1070	0126-2001-1038	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DARYWAN DAMAR BAASITH"}	1
1071	0126-2001-1039	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SAHID EKA DEWANATA"}	1
1072	0126-2001-1040	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FARHAN HABIB WIRAHADI"}	1
1073	0126-2001-1041	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YUDHO FEISAL FEBRIANSYAH"}	1
1074	0126-2001-1042	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GERALDIO ANANTA"}	1
1075	0126-2001-1043	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GILANG ALIEF PUTRA"}	1
1076	0126-2001-1044	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "I PUTU KRISNA ARDIANA PUTRA"}	1
1077	0126-2001-1045	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MIFTAKHUL HUDA NUR ASY-SYIFA AL-ATHTHUUR"}	1
1078	0126-2001-1046	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RADITYA AFIF NUR FADZLAN"}	1
1079	0126-2001-1047	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAFLI KAMARUJAMAN"}	1
1080	0126-2001-1048	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MOCH. RAHADIAN AMANTJIK"}	1
1081	0126-2001-1049	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ENRICO NANDA SETYAKI"}	1
1082	0126-2001-1050	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MULIA RAHMAN RIO ANYA PUTRA"}	1
1083	0126-2001-1051	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "XENOPHTA AULLIA MIFTAHURRAHMANDA"}	1
1084	0126-2001-1052	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD FATURRAHMAN"}	1
1085	0126-2001-1053	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD DZAKWAN AL KHAIRI"}	1
1086	0126-2001-1054	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD SURYA PERDANA"}	1
1087	0126-2001-1055	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DIO ALIEF SYUHADA"}	1
1088	0126-2001-1056	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ABDILLAH DWI CAHYA"}	1
1089	0126-2001-1057	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD HELGA RIZKIAWAN"}	1
1090	0126-2001-1058	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IMAM FAUZI"}	1
1091	0126-2001-1059	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MIDUK ROBINTANG GULTOM"}	1
1092	0126-2001-1060	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD ROFIQ MAUDUDI"}	1
1093	0126-2001-1061	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PAPI GASPER TUAN"}	1
1094	0126-2001-1062	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DANDI PERKASA"}	1
1095	0126-2001-1063	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAHMAT HUSEIN HARAHAP"}	1
1096	0126-2001-1064	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAIHAN KARIM AMRULLAH"}	1
1097	0126-2001-1065	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD SYAHREYZI PASHEY ZULQOERNAIN"}	1
1098	0126-2001-1066	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIFQY ADITYA PERDANA"}	1
1099	0126-2001-1067	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD RIZKI IRWAN"}	1
1100	0126-2001-1068	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MH. GALANG SABILILLAH"}	1
1101	0126-2001-1069	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TOMI NUGROHO"}	1
1102	0126-2001-1070	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "WIDY HANIFIANTO"}	1
1103	0126-2001-1071	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MOCHAMMAD ZIDAN ARDANY"}	1
1104	0126-2001-1072	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADAM MUCHAMMAD BURHANUDDIN"}	1
1105	0126-2001-1073	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AGNAR PRADIPA DANISWARA"}	1
1106	0126-2001-1074	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AHMAD TAQIYUDIN ZALLUM QAZVINI"}	1
1107	0126-2001-1075	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AKBAR ARDI FIRDAUS"}	1
1108	0126-2001-1076	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD AKMAL LUTHFI RAKHMAN"}	1
1110	0126-2001-1078	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ASHAR ALI"}	1
1111	0126-2001-1079	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MOH BAYU AJI PRASETYO"}	1
1112	0126-2001-1080	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "CAESAR RIFQI ARDANA"}	1
1113	0126-2001-1081	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "CHANDRA DIGTA HANGGARA PUTRA"}	1
1114	0126-2001-1082	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIFAN DEWA PRADIKA"}	1
1115	0126-2001-1083	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HARSA ARISYI MAHARAMIS POETRA"}	1
1116	0126-2001-1084	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KHALID JUNDI RABBANI"}	1
1117	0126-2001-1085	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD AZHAR KHAIRULLAH"}	1
1118	0126-2001-1086	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUZAKI KURNIANTO"}	1
1119	0126-2001-1087	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NAUFAL INDRASTOTO NUGROHO"}	1
1120	0126-2001-1088	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "WILDAN NUARY HANDYANTO"}	1
1121	0126-2001-1089	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADITYA RANGGA PRANADEWA"}	1
1122	0126-2001-1090	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PRASETIO ARI WIBOWO"}	1
1123	0126-2001-1091	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAFFI SYAWALLUL RIHAN"}	1
1124	0126-2001-1092	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DHEA ANANDA ROZI"}	1
1125	0126-2001-1093	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TALITHA SASIKIRANA SALIM"}	1
1126	0126-2001-1094	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ZAHRA HANIFA HAFIDZ"}	1
1127	0126-2001-1095	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ZAHRA FEBYTA NORMARIANDRA ATMAJA"}	1
1128	0126-2001-1096	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ZAKIYYATU FADZILLA"}	1
1129	0126-2001-1097	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANA ADINDA SOFIYAH"}	1
1130	0126-2001-1098	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANDINI NOVIANA"}	1
1131	0126-2001-1099	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DEANA ENGRASIA"}	1
1132	0126-2001-1100	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DESSY UTAMI"}	1
1133	0126-2001-1101	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DINAR HAKIM AKBAR"}	1
1134	0126-2001-1102	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DINNY ADE PERTIWI"}	1
1135	0126-2001-1103	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "EMILIA STEFANI BON"}	1
1136	0126-2001-1104	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FENNY MAULIDYA"}	1
1137	0126-2001-1105	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "INDAH TRI AMANDA CHUSNUL KHOTIMAH"}	1
1138	0126-2001-1106	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MARGARETA TITAN ANGGRIANI"}	1
1139	0126-2001-1107	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MAYANG INDRA WIDYASTUTI"}	1
1140	0126-2001-1108	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PHRAMES AYUDYA NARESWARI"}	1
1141	0126-2001-1109	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GALUH ANDAR SIWI"}	1
1142	0126-2001-1110	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAMADHANIA NAJYA MULIA"}	1
1143	0126-2001-1111	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAJA FATHIMAH HERVINA"}	1
1144	0126-2001-1112	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RESTYANA MAHARDIKA"}	1
1145	0126-2001-1113	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NURUL SAKINAH RIFQAYANA AMRU"}	1
1146	0126-2001-1114	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SHARETA ALYA REGHINA"}	1
1147	0126-2001-1115	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SILMI HAYATAN NASHUHA"}	1
1148	0126-2001-1116	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TIA RIANDA"}	1
1149	0126-2001-1117	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ZOIS KLARA"}	1
1150	0126-2001-1118	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RETNO ZAHRATUNNISA"}	1
1151	0126-2001-1119	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AULIA ZHAFIRA"}	1
1152	0126-2001-1120	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BRIGITTA PUNGKI YULIASHARI"}	1
1153	0126-2001-1121	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "CAHYANING GALUH PRAMESTI"}	1
1154	0126-2001-1122	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ENGGAR RAHMA SARI"}	1
1155	0126-2001-1123	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUTHIA RAMADHANTI SUMARNO"}	1
1156	0126-2001-1124	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NADIA AGNES MELINDA"}	1
1157	0126-2001-1125	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NADIYYA AMANDA PUTRI"}	1
1158	0126-2001-1126	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NURUL INTAWATY PERMATA MUSTAMIN"}	1
1159	0126-2001-1127	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YUNIAR AYU RACHMADINI"}	1
1160	0126-2001-1128	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RASENDRIYA ARUNDATI"}	1
1161	0126-2001-1129	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RENITA SHELSA AMALIAH"}	1
1162	0126-2001-1130	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SEPTINA GUMELAR RIADI"}	1
1163	0126-2001-1131	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ROSALIA IKA WIDYASNINGRUM"}	1
1164	0126-2001-1132	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SALSABILA NUR HASNA"}	1
1165	0126-2001-1133	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SEFYA MAGDALENA"}	1
1166	0126-2001-1134	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SELVI JULIANI"}	1
1167	0126-2001-1135	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SEVIRA KHAIRATUN HISAN"}	1
1168	0126-2001-1136	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SITI NURHALIZA"}	1
1169	0126-2001-1137	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SUHITA SANTI MEDINA"}	1
1170	0126-2001-1138	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SYAILA SALAM"}	1
1171	0126-2001-1139	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YOLA AMELIA PUTRI"}	1
1172	0126-2001-1140	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANDINI YUARFIKA"}	1
1173	0126-2001-1141	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PUTRI ANGELINA"}	1
1174	0126-2001-1142	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ASRIKA AMARWATI"}	1
1175	0126-2001-1143	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AYU RATNASARI"}	1
1176	0126-2001-1144	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AZISHANINDYA LISTIVANIPUTRI"}	1
1177	0126-2001-1145	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DELIA RANA AMANDA"}	1
1178	0126-2001-1146	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DINI HALIDA"}	1
1179	0126-2001-1147	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "EKA PUTRI HANA NUR FAUZIYAH"}	1
1180	0126-2001-1148	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KIARA ZULFIANA"}	1
1181	0126-2001-1149	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KINANTHI ANDINI"}	1
1182	0126-2001-1150	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KIRANA ALYA LUTHFA MONACO TRINO"}	1
1183	0126-2001-1151	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LATIFAH NUR ISNAENI"}	1
1184	0126-2001-1152	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LINTANG SAGITA RIZKY"}	1
1185	0126-2001-1153	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LUTFIAH AZIZAH AZZAHRA"}	1
1186	0126-2001-1154	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALICIA MONALISA"}	1
1187	0126-2001-1155	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LINTANG DWI PANGESTU ISMARANATASIA"}	1
1188	0126-2001-1156	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "WENNY HAZMINOVIA SIREGAR"}	1
1189	0126-2001-1157	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AJI TRI NURLAELI"}	1
1190	0126-2001-1158	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MAYERINA AULIANI RAHAYU"}	1
1191	0126-2001-1159	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PRAMESWARY CHANDRA BUANA"}	1
1192	0126-2001-1160	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SRI HANDAYANI"}	1
1193	0126-2001-1161	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IDA ROHMAWATI"}	1
1194	0126-2001-1162	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "INDRI PRASETIA NINGSIH"}	1
1195	0126-2001-1163	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "INTANIA PRABADIANTI"}	1
1196	0126-2001-1164	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JENNY GHIFRINA PUTRI SALSABILLA"}	1
1197	0126-2001-1165	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KEN VANIA"}	1
1198	0126-2001-1166	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KRISTIN ARIANI HUTAHAEAN"}	1
1199	0126-2001-1167	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LALA HUWAIDA MAHIRAH"}	1
1200	0126-2001-1168	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "WIJI LESTARI"}	1
1201	0126-2001-1169	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NADYA ARETHA PUTRI"}	1
1202	0126-2001-1170	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "VINA OKTAPIANI"}	1
1203	0126-2001-1171	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "REHULINA DAHINTA KETAREN"}	1
1204	0126-2001-1172	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SALSABILA NUR FADILAH KUSUMAH"}	1
1205	0126-2001-1173	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SHELA HAJJARIA PUTRI"}	1
1206	0126-2001-1174	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SIYAMIDA FIRA WARDANI"}	1
1207	0126-2001-1175	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SYNTA SALSABILA SUSENO"}	1
1208	0126-2001-1176	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TASYA SALSABIILA"}	1
1209	0126-2001-1177	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "UNI JUWITASARI"}	1
1210	0126-2001-1178	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALIKA AMALIA PUTRI"}	1
1211	0126-2001-1179	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALVIERINA AZZAHRA NINGRUM"}	1
1212	0126-2001-1180	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANNISA PERMATA"}	1
1213	0126-2001-1181	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AULIA PUTRI ARDI"}	1
1214	0126-2001-1182	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DINA FADHILLA SARI"}	1
1215	0126-2001-1183	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DIVA DIANSARI HANGGRAENI"}	1
1216	0126-2001-1184	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FADILLAH"}	1
1217	0126-2001-1185	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MIRANDA CHRISTINE APRINA"}	1
1218	0126-2001-1186	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FEBRIANI NUR AZIZAH"}	1
1219	0126-2001-1187	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HANA SAJIDAH"}	1
1220	0126-2001-1188	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KHALISA WINTARIRANI"}	1
1221	0126-2001-1189	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KUNTUM KHAIRAH UMAH"}	1
1222	0126-2001-1190	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MAWAR APRILLA NUR HAKIKI"}	1
1223	0126-2001-1191	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MEILINDA KUSHERAWATI"}	1
1224	0126-2001-1192	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NANDA GALEA"}	1
1225	0126-2001-1193	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RATNA SARI DEWI"}	1
1226	0126-2001-1194	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SABIRA GERALDA HARNANDA"}	1
1227	0126-2001-1195	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADELIA SEKARSARI"}	1
1228	0126-2001-1196	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SHAFA AULIA ADHA"}	1
1229	0126-2001-1197	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADELLIA GUSTIANDA"}	1
1230	0126-2001-1198	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADISTI CITRA RAMDANI"}	1
1231	0126-2001-1199	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AINI DWI KURNIA PERTIWI"}	1
1232	0126-2001-1200	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANNA NUR MALIANSARI"}	1
1233	0126-2001-1201	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANANDA YUAN AFFRAH"}	1
1234	0126-2001-1202	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANISAH RAMADHANI"}	1
1235	0126-2001-1203	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "CHERYL ARSHIEFA KRISDANU"}	1
1236	0126-2001-1204	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BRENDA DELLA LORENZA"}	1
1237	0126-2001-1205	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "CHILA AULIA AKBAR"}	1
1238	0126-2001-1206	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RETNO DAMMAYATRI"}	1
1239	0126-2001-1207	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DANICA MARSHAFINA TAMIMY HANUN"}	1
1240	0126-2001-1208	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DHINI HAMIDAH"}	1
1241	0126-2001-1209	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DWI YUNIAR AMBARWATI"}	1
1242	0126-2001-1210	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "EKA RACHMADHANI SAFITRI"}	1
1243	0126-2001-1211	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADHISTY ESTHER DEODORA PANJAITAN"}	1
1244	0126-2001-1212	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FANI RIZKI AMALIA ZAKI"}	1
1245	0126-2001-1213	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BILQIS SALMA GINTAJATI"}	1
1246	0126-2001-1214	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HAIFA SHABIRAH"}	1
1247	0126-2001-1215	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HESTINA SYAHRI"}	1
1248	0126-2001-1216	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ICHA EBTIANA PUTRI"}	1
1249	0126-2001-1217	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JASMINE DEVINA FANY ATMAJA"}	1
1250	0126-2001-1218	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JOYVITA LANUEVA HALOHO"}	1
1251	0126-2001-1219	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KHAIRUNNISA NURUL ISTIQOMAH"}	1
1252	0126-2001-1220	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANINDA OCTO LAILA"}	1
1253	0126-2001-1221	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LUFFYANA ARBIANTI"}	1
1254	0126-2001-1222	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MIRANDA AZALIA"}	1
1255	0126-2001-1223	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NABILA NUR ANNISA KUSUMA PUTRI"}	1
1256	0126-2001-1224	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PANGESTUTI DIAH RIZKI"}	1
1257	0126-2001-1225	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAHAJENG AULIA AZMI"}	1
1258	0126-2001-1226	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SALMA ZAVIRA"}	1
1259	0126-2001-1227	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SRI SAKHINAH RAHAYU"}	1
1260	0126-2001-1228	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SYARAFINA RIZKA LUTVIANI"}	1
1261	0126-2001-1229	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SYAFIYATULQULUB SOKA NUGROHO"}	1
1262	0126-2001-1230	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SYINTHIA MAEDY"}	1
1263	0126-2001-1231	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YENI IKAWATI"}	1
1264	0126-2001-1232	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YUKITA SARI"}	1
1265	0126-2001-1233	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADISA ZIDA KAMILA"}	1
1266	0126-2001-1234	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AINUN HIDAYATI"}	1
1267	0126-2001-1235	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AKMALIA PUTRI"}	1
1268	0126-2001-1236	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PUTRI AMANDA KHAIRUNNISA"}	1
1269	0126-2001-1237	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NURUL ARIFIN ARISTARINI"}	1
1270	0126-2001-1238	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AURELLIA RIYANDITA PUTRI"}	1
1271	0126-2001-1239	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "CYNTHIA HUTAPEA"}	1
1272	0126-2001-1240	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DEBY AULIA FANDANI"}	1
1273	0126-2001-1241	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DEVINA AURA ISLAMAY"}	1
1274	0126-2001-1242	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DHEA NUR ANNISAH"}	1
1275	0126-2001-1243	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FEBY REYNA PUTRI"}	1
1276	0126-2001-1244	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FIRYAL QISTHI ANDARA"}	1
1277	0126-2001-1245	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "INTAN NARISWARI ARDININGRUM"}	1
1278	0126-2001-1246	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JANNATUL QOLBI ASH SHIDDIQI"}	1
1279	0126-2001-1247	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JESICA OKTAVIA BR. GINTING"}	1
1280	0126-2001-1248	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LARASATI OKKA WIDHANNY"}	1
1281	0126-2001-1249	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LYDIA ESTERLITA BARUS"}	1
1282	0126-2001-1250	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MAHALIA TARANRINI"}	1
1283	0126-2001-1251	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MAS DEN RUM"}	1
1284	0126-2001-1252	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MELLA SILVIANA DAMAYANTI"}	1
1285	0126-2001-1253	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NADIA KHAIRUNNISA"}	1
1286	0126-2001-1254	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NADILA OCTARIA MILENIA"}	1
1287	0126-2001-1255	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NANDAREZA DEVINA RAISSA PUTRI"}	1
1288	0126-2001-1256	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NANDHIRA NURSITA TYASMARA"}	1
1289	0126-2001-1257	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NAOMI CIMERA"}	1
1290	0126-2001-1258	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NOVIA SARTIKA SIHOTANG"}	1
1291	0126-2001-1259	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NURAH NUFAISAH"}	1
1292	0126-2001-1260	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PUTRI SRI LESTARI"}	1
1293	0126-2001-1261	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RATU AULIA"}	1
1294	0126-2001-1262	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIBKA SULASTRI PARDEDE"}	1
1295	0126-2001-1263	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIFA AMALIA"}	1
1296	0126-2001-1264	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIZQA MAULINA DESSAFITRI"}	1
1297	0126-2001-1265	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIZTASYA QONITAH DEWI"}	1
1298	0126-2001-1266	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ROSITA RACHMA"}	1
1299	0126-2001-1267	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RR. SAFINA FEBRIYANTI"}	1
1300	0126-2001-1268	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SHAFIRA NUR ADININGSIH"}	1
1301	0126-2001-1269	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SHABRINA MITSALINA"}	1
1302	0126-2001-1270	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SINTANI ALLYSSA PUTRI"}	1
1303	0126-2001-1271	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NADIA SWASTI PARAMITHA SALSABILA"}	1
1304	0126-2001-1272	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SYAFIRA RAMADHANTY ZULFAN"}	1
1305	0126-2001-1273	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SYAVIRA YOPIANANDA"}	1
1306	0126-2001-1274	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TAAJKHANSA NAJLA"}	1
1307	0126-2001-1275	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALYA TALITHA LARASATI"}	1
1308	0126-2001-1276	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TALITHA NURSABILA"}	1
1309	0126-2001-1277	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TANIA MARCELLA TARIGAN"}	1
1310	0126-2001-1278	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "THERESA AGUSTIN SIAHAAN"}	1
1311	0126-2001-1279	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TIVA SAKILAH"}	1
1312	0126-2001-1280	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "VALDA YASMINA PUTRI"}	1
1313	0126-2001-1281	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "VINA AMANDA"}	1
1314	0126-2001-1282	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YUSTIKA AMANDA"}	1
1315	0126-2001-1283	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAMADHANESHA ADHELA SABHIRA"}	1
1316	0126-2001-1284	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AFIFAH DAYINTA SARI"}	1
1317	0126-2001-1285	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANITA ANGRAENI"}	1
1318	0126-2001-1286	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AULIA WIDSAY SALSABILA NISA"}	1
1319	0126-2001-1287	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BELLA VIRGIE SIRAIT"}	1
1320	0126-2001-1288	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DIAZ GIAN CLARESTA"}	1
1321	0126-2001-1289	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SHIFA FAUZIA"}	1
1322	0126-2001-1290	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HANIFAH FAKHRUN NISA"}	1
1323	0126-2001-1291	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "INTAN HAMIDA"}	1
1324	0126-2001-1292	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DINA MALSYAGE"}	1
1325	0126-2001-1293	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DEANA YOSEPHINE MANURUNG"}	1
1326	0126-2001-1294	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MARAM AZIZAH"}	1
1327	0126-2001-1295	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NAILA QANITA ZHARIFA"}	1
1328	0126-2001-1296	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NURDINI HADAINA KAMAL"}	1
1329	0126-2001-1297	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PINASTI PURBANING SUCI"}	1
1330	0126-2001-1298	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RANIA RUSYDA"}	1
1331	0126-2001-1299	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "REGA LUTFIANI"}	1
1332	0126-2001-1300	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SAFITRI MURTYAS"}	1
1333	0126-2001-1301	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SEPTIANTI LAILI SOFIANA"}	1
1334	0126-2001-1302	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BURTIN MARTYA POPTAMIRDA"}	1
1335	0126-2001-1303	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "VINA RIZKIA SUSAMTO"}	1
1336	0126-2001-1304	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YOHANIKA KURNIA PUTRI"}	1
1337	0126-2001-1305	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YURISTYA NADIA HANISADEWI"}	1
1338	0126-2001-1306	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FATIMAH AZ-ZAHRO"}	1
1339	0126-2001-1307	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUTHYA RAHMA DINI"}	1
1340	0126-2001-1308	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FATI ANDARI ALMAHDINI"}	1
1341	0126-2001-1309	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FATIATUR RAHIM EL FIKRI"}	1
1342	0126-2001-1310	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FAZADIARA DEIGRATIE SOPHIA"}	1
1343	0126-2001-1311	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AIDA AMALIA FATIHA"}	1
1344	0126-2001-1312	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANDI APRILIA TENRI TODJA"}	1
1345	0126-2001-1313	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AQEELA FATHYA NAJWA"}	1
1346	0126-2001-1314	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NURUL AZURA WARDANI"}	1
1347	0126-2001-1315	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FAIZA AYU RIBAWANING SEKAR"}	1
1348	0126-2001-1316	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANNISA SEPFINARIYAH"}	1
1349	0126-2001-1317	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HASNA MAULIDA RAHMANIAR"}	1
1350	0126-2001-1318	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ISNA ADE SALSABILA"}	1
1351	0126-2001-1319	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LEA VANYA CHAMILANI AZHARI"}	1
1352	0126-2001-1320	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RONA BUNGA MAWAR"}	1
1353	0126-2001-1321	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NATASHA MUTI HAFIZA"}	1
1354	0126-2001-1322	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAHMA SHABRINA RAMADHANI"}	1
1355	0126-2001-1323	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RALITSA ZHARFAN KLAURA"}	1
1356	0126-2001-1324	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RHEINA YOVIAL KUSUMASTUTI"}	1
1357	0126-2001-1325	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MAY ZELA SETYONING TIAS"}	1
1358	0126-2001-1326	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SANIA SALSABILA"}	1
1359	0126-2001-1327	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SULISTIO WATI CAHYA NINGRUM"}	1
1360	0126-2001-1328	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "T. SY. ZAHIYYAH AINI WANDA PUTRI"}	1
1361	0126-2001-1329	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TITI ERIWANTI"}	1
1362	0126-2001-1330	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TITISARI PUSPADEWI"}	1
1363	0126-2001-1331	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "VANIA CHRISTOSYE BR. KALIT"}	1
1364	0126-2001-1332	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "VIRLY SHAFIRA NAZUAR"}	1
1365	0126-2001-1333	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YUNI KARTIKA"}	1
1366	0126-2001-1334	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAHMA THIFALIA ZEIN"}	1
1367	0126-2001-1335	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ZUMNA NASYAHTA JINGGA"}	1
1368	0126-2001-1336	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALFRIDA RAHMADHANI ANITA PUTRI"}	1
1369	0126-2001-1337	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANGEL REZKY PRATAMA TANDA"}	1
1370	0126-2001-1338	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANNISAUL MASLAMAH"}	1
1371	0126-2001-1339	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARIFAH USWATUN KOSSAH"}	1
1372	0126-2001-1340	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ATMAJUWITA MARSAL"}	1
1373	0126-2001-1341	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AYU NATALIA MANALU"}	1
1374	0126-2001-1342	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BERLYANA HELVY APANDI"}	1
1375	0126-2001-1343	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DEBBY ANDI MARIA"}	1
1376	0126-2001-1344	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DINA APRILIA ISWARA"}	1
1377	0126-2001-1345	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DYAH KUSUMAWARDHANI"}	1
1378	0126-2001-1346	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IHDA ANIQOH"}	1
1379	0126-2001-1347	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IRIANI RATNA DEWI"}	1
1380	0126-2001-1348	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JUSTITIA RESALANE"}	1
1381	0126-2001-1349	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MELY CHINTHYA DEVI"}	1
1382	0126-2001-1350	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MIFTAH THANIA LUBIS"}	1
1383	0126-2001-1351	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUZDALIFAH MEI NURHAYATI"}	1
1384	0126-2001-1352	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NORMA KINANTY"}	1
1385	0126-2001-1353	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DEBORA REALIN SELICIA TAMBUNAN"}	1
1386	0126-2001-1354	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "REZKI ROBIATUL AISYIAH ISMAIL"}	1
1387	0126-2001-1355	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SANDRA FIRDAUSI APRILIA"}	1
1388	0126-2001-1356	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SHERLY TAMARINDINI TELAN"}	1
1389	0126-2001-1357	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SYAHNA NABILA RACHMANIA"}	1
1390	0126-2001-1358	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD ALI MASUM YOGA PRATAMA"}	1
1391	0126-2001-1359	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AMMAR NAJMI ADRA"}	1
1392	0126-2001-1360	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALDINO ERLANGGA DESIARIYANTO"}	1
1393	0126-2001-1361	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DOOHAN JOHANNES PAKPAHAN"}	1
1394	0126-2001-1362	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FADIL MUHAMMAD FATTAH"}	1
1395	0126-2001-1363	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FAIQUL WASHFI"}	1
1396	0126-2001-1364	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD HAFIZS FAZALIKA"}	1
1397	0126-2001-1365	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IDRIS VAN JOEL SIAHAAN"}	1
1398	0126-2001-1366	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KRISYANTO SATRIA HABEAHAN"}	1
1399	0126-2001-1367	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD ZULFA ALWAN"}	1
1400	0126-2001-1368	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD HABIB AGIL"}	1
1401	0126-2001-1369	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD AINAL RAFI"}	1
1402	0126-2001-1370	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NANANG KARISMA FEBRIANTO"}	1
1403	0126-2001-1371	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IVAN IZDIHAR RIVALDY"}	1
1404	0126-2001-1372	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ROBBY PARLINDUNGAN"}	1
1405	0126-2001-1373	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ROY PUTRA ANDIKA AMBARITA"}	1
1406	0126-2001-1374	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SATYA PRATAMA PUTRA"}	1
1407	0126-2001-1375	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FIKRIE ALIA"}	1
1408	0126-2001-1376	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YESICA STEPHANY SIMBOLON"}	1
1409	0126-2001-1377	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ZAENURI ALDI PRAYOGA"}	1
1410	0126-2001-1378	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FUAD ZUHAIR"}	1
1411	0126-2001-1379	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AHMAD AIDIL YUNUS"}	1
1412	0126-2001-1380	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BAGAS AISHWARA PUTRA GUMILANG"}	1
1413	0126-2001-1381	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BAYU ALSA DEWA"}	1
1414	0126-2001-1382	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FAJAR ARYA PANGESTU"}	1
1415	0126-2001-1383	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BINTANG NUR NGRAFELA"}	1
1416	0126-2001-1384	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DEDY TRI LAKSONO"}	1
1417	0126-2001-1385	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FAJAR KUNCORO YAKTI"}	1
1418	0126-2001-1386	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FAJRI HAMDANY"}	1
1419	0126-2001-1387	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AHMAD WILDAN HUSNA"}	1
1420	0126-2001-1388	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IKHSAN FAJRIANSYAH"}	1
1421	0126-2001-1389	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JIDHAN ABDILLAH"}	1
1422	0126-2001-1390	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TEDDY ERYANSYAH BACHTIAR"}	1
1423	0126-2001-1391	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AFRIAN ARGA PRASTYA"}	1
1424	0126-2001-1392	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FARHAN ARYADITYA PUTRA BASTIAN"}	1
1425	0126-2001-1393	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KOMANG SWADANA"}	1
1426	0126-2001-1394	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD CATUR RACHMAN"}	1
1427	0126-2001-1395	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "WAHYU WIRADINATA"}	1
1428	0126-2001-1396	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ABDUL HAMID SYARIFUDDIN"}	1
1429	0126-2001-1397	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADITYA FIRMANSYAH"}	1
1430	0126-2001-1398	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AGAM ABDILLAH"}	1
1431	0126-2001-1399	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUH. ARYA RAHMAN"}	1
1432	0126-2001-1400	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MOCH NOER BAIHAQY. IB"}	1
1433	0126-2001-1401	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD DANIEL"}	1
1434	0126-2001-1402	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MARCEL TOAR RIZKI LENGKONG"}	1
1435	0126-2001-1403	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MIKHAEL JONES SITOHANG"}	1
1436	0126-2001-1404	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MOHAMMAD FALDI MAULIDTYA BAI"}	1
1437	0126-2001-1405	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUH MIFTAHUL RIZQI MAULANA"}	1
1438	0126-2001-1406	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD SETYO ARIFUDDIN"}	1
1439	0126-2001-1407	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD AL JASIYAH HERIANTO DUNDU"}	1
1440	0126-2001-1408	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NANDA APRILIANO"}	1
1441	0126-2001-1409	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NOVRIANDI PARDOSI"}	1
1442	0126-2001-1410	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD YASIN RAMADAN"}	1
1443	0126-2001-1411	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AL HUDHA MAY RESQA PUTRA"}	1
1444	0126-2001-1412	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANDRA HARIAWAN"}	1
1445	0126-2001-1413	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANDRE SYAH PUTRA"}	1
1446	0126-2001-1414	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANUGRAH TRI SAPUTRA"}	1
1447	0126-2001-1415	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "APRI LIANSYAH"}	1
1448	0126-2001-1416	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARIQ BAGAS MAULANA"}	1
1449	0126-2001-1417	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARYA MARTA"}	1
1450	0126-2001-1418	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AZIZIL ALIM ALAMSYAH"}	1
1451	0126-2001-1419	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "CHRISTIAN NATANAEL TONAPA"}	1
1452	0126-2001-1420	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANUGRAH FIRDAUS DHAMASTITO"}	1
1453	0126-2001-1421	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DHIMAS TANTRA GHAZALI"}	1
1454	0126-2001-1422	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FAQIH NUR HAFIDZUDDIN"}	1
1455	0126-2001-1423	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FERDINAN HIA"}	1
1456	0126-2001-1424	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HIMAWAN"}	1
1457	0126-2001-1425	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IKA PAKSI CAKRA BUANA"}	1
1458	0126-2001-1426	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADITYA PUTRA BERIDA"}	1
1459	0126-2001-1427	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AGUSTINO SAPUTRA"}	1
1460	0126-2001-1428	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALDI FIQRANDA WIRANATA"}	1
1461	0126-2001-1429	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HERRY ALDINO"}	1
1462	0126-2001-1430	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "A.R. YAKUB MAGRIBI"}	1
1463	0126-2001-1431	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "CHARTER JULIO SILITONGA"}	1
1464	0126-2001-1432	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BILAL ALFAZRI"}	1
1465	0126-2001-1433	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BINTAMA ZENO SURBAKTI"}	1
1466	0126-2001-1434	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BONA ULI HARAHAP"}	1
1467	0126-2001-1435	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "WILLY DOZEN"}	1
1468	0126-2001-1436	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FAHRI TRIHARYONO"}	1
1469	0126-2001-1437	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FARHAN TRI KURNIAWAN"}	1
1470	0126-2001-1438	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AZAN HATAMI"}	1
1471	0126-2001-1439	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AHMAD MAULANA"}	1
1472	0126-2001-1440	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALIF MUYASSAR YUSI"}	1
1473	0126-2001-1441	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "VERI ZAKARIA"}	1
1474	0126-2001-1442	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M ARFIN RIZALDI HADIMAN"}	1
1475	0126-2001-1443	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADIEN SYAWALIA DELIMA"}	1
1476	0126-2001-1444	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADO ILLAHI"}	1
1477	0126-2001-1445	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AGANDHI NUR HABIB"}	1
1478	0126-2001-1446	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AHMAD ILHAM AKBAR"}	1
1479	0126-2001-1447	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AKMAL MAULANA ADRIANSYAH"}	1
1480	0126-2001-1448	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AZHAR FIRDAUS VINOSELLA"}	1
1481	0126-2001-1449	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BIMA BINTANG ABDILLAH"}	1
1482	0126-2001-1450	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "CHANDRA AL HAYYU"}	1
1483	0126-2001-1451	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DAVA MAULANA"}	1
1484	0126-2001-1452	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FABIAN DAVINO FERDIANTO"}	1
1485	0126-2001-1453	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FARIZ AFIF SETYAWAN"}	1
1486	0126-2001-1454	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GALIH TYASTAMA"}	1
1487	0126-2001-1455	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADITYA HAFIDHIAN NUGROHO"}	1
1488	0126-2001-1456	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HAFIDZ ALAHUDIN"}	1
1489	0126-2001-1457	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HASAN ZUHHAD MAHYA"}	1
1490	0126-2001-1458	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HIZKIA ANENDA LAGA"}	1
1491	0126-2001-1459	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ILHAM ANDIKA RAHMAN"}	1
1492	0126-2001-1460	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IHSAN RAFIF"}	1
1493	0126-2001-1461	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JESSU OKRIANDINATA"}	1
1494	0126-2001-1462	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FASKAL GEMILANG"}	1
1495	0126-2001-1463	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DZAMAR RAFI THARIQ PRASETYO"}	1
1496	0126-2001-1464	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YORA MEDIANANTO"}	1
1497	0126-2001-1465	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SATRIA ANADEUS DAVI SUSENO"}	1
1498	0126-2001-1466	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAYFANDY JOKO HERLAMBANG"}	1
1499	0126-2001-1467	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIZQI ILHAM SETYAWAN"}	1
1500	0126-2001-1468	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DESTA NUGRAHA ARDINANTA"}	1
1501	0126-2001-1469	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FAUZAN ADETYA PRADANA"}	1
1502	0126-2001-1470	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IKBAR NABIL SAIFUHRI"}	1
1503	0126-2001-1471	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KENANDIKHA ILHAM HASSANI"}	1
1504	0126-2001-1472	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IQBAL BAIHAQI FIRDIANSYAH"}	1
1505	0126-2001-1473	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IVAN BERTRAND REYNALDI WIDAGDO"}	1
1506	0126-2001-1474	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JATNIKA SALMAN RASPATI"}	1
1507	0126-2001-1475	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JHON PENGARAPEN BARUS"}	1
1508	0126-2001-1476	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KAMALUDIN NURSAL"}	1
1509	0126-2001-1477	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAIHAN FAUZIAN PRATAMA"}	1
1510	0126-2001-1478	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YONATHAN HARY HUTAGALUNG"}	1
1511	0126-2001-1479	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PRIYO HERLAMBANG"}	1
1512	0126-2001-1480	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD FALDIYAN"}	1
1513	0126-2001-1481	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NAZMI ROAN PRATAMA"}	1
1514	0126-2001-1482	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SENNA WIJAYA"}	1
1515	0126-2001-1483	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SYAFRIZAL AMBIYA"}	1
1516	0126-2001-1484	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HILMY ABDURRAHMAN"}	1
1517	0126-2001-1485	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JONATHAN FERNANDO SIBARANI"}	1
1518	0126-2001-1486	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD RIO RAFDY ISKANDAR"}	1
1519	0126-2001-1487	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAFI RABBANI FIRDAUS"}	1
1520	0126-2001-1488	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAFLY BACHTIAR YUSUF"}	1
1521	0126-2001-1489	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAHULFAJRI ASH-SHAFFAN YAHYA"}	1
1522	0126-2001-1490	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAUHUL RAHMAN ADAM"}	1
1523	0126-2001-1491	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "REZANANDA YULIAN AKBAR"}	1
1524	0126-2001-1492	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIAN FATRA WIJAYA"}	1
1525	0126-2001-1493	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD RIFKY AZIZ"}	1
1526	0126-2001-1494	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIFKY NAUFAL"}	1
1527	0126-2001-1495	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIZKY MURSYIDAN BALDAN"}	1
1528	0126-2001-1496	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TRI BAGUS CAHYONO"}	1
1529	0126-2001-1497	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HIBATUL WAFI"}	1
1530	0126-2001-1498	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALIF AKBAR SUDARMANTO"}	1
1531	0126-2001-1499	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADAM ENDRAPRIANTO"}	1
1532	0126-2001-1500	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADAM KAUSAR"}	1
1533	0126-2001-1501	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ERZA ADE MAHENDRA"}	1
1534	0126-2001-1502	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD ADIETHYA EKAVIANDRA"}	1
1535	0126-2001-1503	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADITYA WIKARSA"}	1
1536	0126-2001-1504	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AHMAD ILHAM FACHRIZA"}	1
1537	0126-2001-1505	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AHMAD IZZUL RAMADHANI"}	1
1538	0126-2001-1506	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AHMAD SYARIF"}	1
1539	0126-2001-1507	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AHMAD NAUFAL PUTRA ICHSAN"}	1
1540	0126-2001-1508	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AKBAR KURNIAWAN"}	1
1541	0126-2001-1509	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALBERT AGUNG FEBIAN PANGARIBUAN"}	1
1542	0126-2001-1510	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LOURENTIUS ALFARIO HERNANDA"}	1
1543	0126-2001-1511	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALFATH IQBAAL CHAIRULHAQ"}	1
1544	0126-2001-1512	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALMERDO AGSA SOROINAMA HIA"}	1
1545	0126-2001-1513	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANANDA INDRA KUSUMA"}	1
1546	0126-2001-1514	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANDREAN FALAH"}	1
1547	0126-2001-1515	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANUGRAH MICHAEL SAMUEL SITUMORANG"}	1
1548	0126-2001-1516	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANWAR MUSTOFA"}	1
1549	0126-2001-1517	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AYAT ARAHMAN"}	1
1550	0126-2001-1518	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARBI RIZAL HAQ"}	1
1551	0126-2001-1519	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARDIN NAUFAL GANIMEDA"}	1
1552	0126-2001-1520	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARDIAN WAHYU AGUNG PRABAWA"}	1
1553	0126-2001-1521	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARGADO PHILIPO HINCA SILABAN"}	1
1554	0126-2001-1522	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ATHALLAH ZAHRAN ELLANDRA"}	1
1555	0126-2001-1523	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DAFFA ATHAULLAH"}	1
1556	0126-2001-1524	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BOYS PUTRA ANGGOMAN DABUKKE"}	1
1557	0126-2001-1525	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "CHANDRA NOOR WIJAYA"}	1
1558	0126-2001-1526	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FASHABIAL YUNANDA"}	1
1559	0126-2001-1527	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DAFA TEMIYAH"}	1
1560	0126-2001-1528	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DAVIN SATRIA BIMA ANGGARA"}	1
1561	0126-2001-1529	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DEDEN ARDIANSYAH"}	1
1562	0126-2001-1530	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DHAFA WAHYU RAMADHAN"}	1
1563	0126-2001-1531	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DHANI ARIQOH IHSAN RIZQULLAH"}	1
1564	0126-2001-1532	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DIYO IMAM MUHTARAM"}	1
1565	0126-2001-1533	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "EDWARD STEVEN TIMOTHY NAINGGOLAN"}	1
1566	0126-2001-1534	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "CRISTO MARCELY LUCIO NGASI RAJA"}	1
1567	0126-2001-1535	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ERIC PETER HALOMOAN"}	1
1568	0126-2001-1536	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FAHREZA AJI TARUNA"}	1
1569	0126-2001-1537	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FAHRUL RAZI"}	1
1570	0126-2001-1538	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FAKHRI SURYA HENDRIANTO"}	1
1571	0126-2001-1539	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FANDI WAHYUDI MAHA"}	1
1572	0126-2001-1540	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FAREL NAUFAL AKBAR"}	1
1573	0126-2001-1541	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FARHAN NARENDRATAMA"}	1
1574	0126-2001-1542	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FARHAN PRAMODA ADHYASTA"}	1
1575	0126-2001-1543	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FARID SULAIMAN PULUNGAN"}	1
1576	0126-2001-1544	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FARUG HUMAN MAULANA"}	1
1577	0126-2001-1545	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M. FARUQ AMIR"}	1
1578	0126-2001-1546	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FAUZI FEBRIANTO SYAHPUTRA"}	1
1579	0126-2001-1547	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FEBRI RAHMAN AMMARULLAH"}	1
1580	0126-2001-1548	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FADEYYIN FUQOHA AKBAR"}	1
1581	0126-2001-1549	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FARREL CHRISTOPHER ALPHA"}	1
1582	0126-2001-1550	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GALIH KENCANA"}	1
1583	0126-2001-1551	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GAMANTARA RIZKY MILIAN WARTONO"}	1
1584	0126-2001-1552	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KAHLIL GHIBRAN"}	1
1585	0126-2001-1553	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GILANG FAJAR AL MADANI"}	1
1586	0126-2001-1554	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GLENN LUDWIG"}	1
1587	0126-2001-1555	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD HISYAM THORIQ"}	1
1588	0126-2001-1556	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IDHAM AZIS MUHAIMIN"}	1
1589	0126-2001-1557	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JUAN MARVEL YUDA RIO NUGRAHA"}	1
1590	0126-2001-1558	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KEVIN ARON KEMBAREN"}	1
1591	0126-2001-1559	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GERHANA RISQI PRASETYO"}	1
1592	0126-2001-1560	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALDIKA CAHYA NARENDRA"}	1
1593	0126-2001-1561	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NAUFAL SULTAN AZZAM KHAN"}	1
1594	0126-2001-1562	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PANDU SETIABUDI UTAMA"}	1
1595	0126-2001-1563	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAFFA MULIA MAULANA"}	1
1596	0126-2001-1564	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALTAV RAY"}	1
1597	0126-2001-1565	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIFQY ANGGORO SENOPUTRO"}	1
1598	0126-2001-1566	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARMANDO FRANSISKUS SUARLEMBIT"}	1
1599	0126-2001-1567	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "WILDAN PRAMADISTYA RIFLIANSAH"}	1
1600	0126-2001-1568	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ZET FAWER SIANTURI"}	1
1601	0126-2001-1569	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NUZUL HIDAYAT"}	1
1602	0126-2001-1570	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD ADZZIKRA HARAHAP"}	1
1603	0126-2001-1571	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD AJI PANGESTU"}	1
1604	0126-2001-1572	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD AJMAL QOLFATHRIYUUS"}	1
1605	0126-2001-1573	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M. ALDINO GUSANDA"}	1
1606	0126-2001-1574	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KEMAS MUHAMMAD AZMI"}	1
1607	0126-2001-1575	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IMAM DZAKI HIDAYAD ASSIDIQI"}	1
1608	0126-2001-1576	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "I KETUT MEGA PUTRA ANANTARA"}	1
1609	0126-2001-1577	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD FADEL RAMADHAN"}	1
1610	0126-2001-1578	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUH FADLY ASHFARI"}	1
1611	0126-2001-1579	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD ELIAN FARELL"}	1
1612	0126-2001-1580	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD FATHURRACHMAN FAJRI"}	1
1613	0126-2001-1581	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PRASOJO FEBRYANTO"}	1
1614	0126-2001-1582	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD FITRA RULIANSYAH"}	1
1615	0126-2001-1583	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMAD IQBAL HADI SAPUTRA"}	1
1616	0126-2001-1584	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HASNAN HABIBULLAH"}	1
1617	0126-2001-1585	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HENDRY CHRISTIAN PURBA"}	1
1618	0126-2001-1586	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HILAL MOHAMMAD FIKRY"}	1
1619	0126-2001-1587	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD HILMI  QURROTA AYUN"}	1
1620	0126-2001-1588	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMMAD IHSAN"}	1
1621	0126-2001-1589	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "R. MOCH. ILHAM ADRIANSYAH"}	1
1622	0126-2001-1590	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "INAS EGA BINTANG"}	1
1623	0126-2001-1591	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IQBAL SEPTIAJI HANDOYO"}	1
1624	0126-2001-1592	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IVAN BENYAMIN MARPAUNG"}	1
1625	0126-2001-1593	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IVAN FAJAR PRASETYO"}	1
1626	0126-2001-1594	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JUSTIN FERDY MUNTHE"}	1
1627	0126-2001-1595	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JUSTIN MAKARIM PRADIPTA YUNIMAN"}	1
1628	0126-2001-1596	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KEI HAPETUA"}	1
1629	0126-2001-1597	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KIKI PRATOMO"}	1
1630	0126-2001-1598	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD KINDI DAYU ISYA"}	1
1631	0126-2001-1599	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MARC RONAND ANTONIO LESNUSSA"}	1
1632	0126-2001-1600	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LUKAS GLORYAN JUNIUS"}	1
1633	0126-2001-1601	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MOCHAMMAD LUTHFI MUBARAK"}	1
1634	0126-2001-1602	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M. RIFQY MOESA PARISI"}	1
1635	0126-2001-1603	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD RIZQI HAYKAL"}	1
1636	0126-2001-1604	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MARTIN BINAR EBENEZER"}	1
1637	0126-2001-1605	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD RASYIDDIN MASRI"}	1
1638	0126-2001-1606	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD DAFA MAULANA SETIA"}	1
1639	0126-2001-1607	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD FAIZIL AKBAR"}	1
1640	0126-2001-1608	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MICHAEL LIHOU PURBA"}	1
1641	0126-2001-1609	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MICHAEL AGI PRANANTA WIBOWO"}	1
1642	0126-2001-1610	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIZKI PADHLUR RAHMAN"}	1
1643	0126-2001-1611	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD RIDHO"}	1
1644	0126-2001-1612	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD ARIES FIRDAUS"}	1
1645	0126-2001-1613	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD FAJRI AL AMIN"}	1
1646	0126-2001-1614	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUH IHSANUL LISAN AS"}	1
1647	0126-2001-1615	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD RAUDATUL AULIA"}	1
1648	0126-2001-1616	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD RAUDY"}	1
1649	0126-2001-1617	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD WAHYU"}	1
1650	0126-2001-1618	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD MUIS PASCA FITRAHWAN"}	1
1651	0126-2001-1619	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MOHAMMAD ZUBAIR"}	1
1652	0126-2001-1620	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NATANAEL BHASKARA WOHINGATI GANI"}	1
1653	0126-2001-1621	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NAUFAL AL-AZIZ"}	1
1654	0126-2001-1622	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD NAUFAL IFKY IRWANSYAH"}	1
1655	0126-2001-1623	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NIKO JAYA KUSUMA"}	1
1656	0126-2001-1624	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAMA NOVTIAN ARDI"}	1
1657	0126-2001-1625	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NOVYAR BOY PUTRA SARAGI"}	1
1658	0126-2001-1626	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "OKTORIZA ADYAPRASASTA"}	1
1659	0126-2001-1627	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "OKA PAHALA RAMADHAN"}	1
1660	0126-2001-1628	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PAUL PATRICK SIMANJUNTAK"}	1
1661	0126-2001-1629	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PRAMUDITO LUHUR SUKMANA"}	1
1662	0126-2001-1630	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PRAMUDYA BAGAS BANUAJI"}	1
1663	0126-2001-1631	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAFLI ABIGAIL WIJANARKO"}	1
1664	0126-2001-1632	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "R WIBAWA BISMA"}	1
1665	0126-2001-1633	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD RADITYA ADHI PRAMANA"}	1
1666	0126-2001-1634	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MOCHAMAD RAFLY AFLAKHUL UMAM"}	1
1667	0126-2001-1635	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAHMANDIKA"}	1
1668	0126-2001-1636	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAHMAT MAULANA"}	1
1669	0126-2001-1637	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAIHAN HUSNUL WAFA"}	1
1670	0126-2001-1638	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAIHAN RADYA CHOLIL"}	1
1671	0126-2001-1639	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAZAN DHUHA NARENDRA"}	1
1672	0126-2001-1640	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RESTU AJI EKA PUTRA"}	1
1673	0126-2001-1641	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "REZA OKTRIADI"}	1
1674	0126-2001-1642	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIFKI RIANSYAH"}	1
1675	0126-2001-1643	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RISANG PUJASTAWA"}	1
1676	0126-2001-1644	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RISDAN NUR ZAMAN"}	1
1677	0126-2001-1645	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M. AKBARIZAN RASYID"}	1
1678	0126-2001-1646	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIZKI RAMADHAN"}	1
1679	0126-2001-1647	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIZKY MAULANA PRASETYO"}	1
1680	0126-2001-1648	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIZQI NUGRAHA AULIA DWI PUTRA"}	1
1681	0126-2001-1649	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RYAN FIKRI HAKIM"}	1
1682	0126-2001-1650	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RYAN MAHADI CHRISTIAN"}	1
1683	0126-2001-1651	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SAIFUL FAKHRI FADHILA"}	1
1684	0126-2001-1652	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SEPTIAN MAHADANA JAYA"}	1
1685	0126-2001-1653	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD SHIDDIQ PUTRA"}	1
1686	0126-2001-1654	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD SHOFWAN ZAKI"}	1
1687	0126-2001-1655	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD TSANI PRAWIRA"}	1
1688	0126-2001-1656	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PUTRA AHNAF FAADIHILAH"}	1
1689	0126-2001-1657	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "R. VICKY BAYU SETYAWAN PUTRA P"}	1
1690	0126-2001-1658	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD YUSUF SUFANDY"}	1
1691	0126-2001-1659	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "WARANEY CROSSCHIFXCIO MILANISTI IMON"}	1
1692	0126-2001-1660	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "STEVEN KURNIA JUMADI TANDIARRANG"}	1
1693	0126-2001-1661	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SYED NAFTALI WADID"}	1
1694	0126-2001-1662	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "THORIQ AZHAR NUGRAHA"}	1
1695	0126-2001-1663	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TIMOTIUS VINCENT"}	1
1696	0126-2001-1664	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TUMPAL PASKALIS"}	1
1697	0126-2001-1665	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "VEDI AZRA KAHIN"}	1
1698	0126-2001-1666	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "VINCENTIUS ABEDNEGO NASUTION"}	1
1699	0126-2001-1667	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "VINITO RAHMAT FEBRIANO"}	1
1700	0126-2001-1668	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "VIPTASYAH GIRI NAKHLA AQILA"}	1
1701	0126-2001-1669	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "WAHYU RIZKIA YUREV"}	1
1702	0126-2001-1670	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YOSEPH SATRIA ADIATMA"}	1
1703	0126-2001-1671	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YOSUA SITANGGANG"}	1
1704	0126-2001-1672	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YUKI MUHAMAD FIRDAUS"}	1
1705	0126-2001-1673	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ZAKI PRIAMBUDI"}	1
1706	0126-2001-1674	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ZULFA AZIZIE WINDYAPUTRA"}	1
1707	0126-2001-1675	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ZULFIKAR MUHAMMAD AGIEL"}	1
1708	0126-2001-1676	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALI FATAH"}	1
1709	0126-2001-1677	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANDHIKA TRI PRISTIADI"}	1
1710	0126-2001-1678	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AYNDRI CATURPRABAMUKTI PURBANINGTYAS"}	1
1711	0126-2001-1679	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD FARHAN NAUFAL AKBAR"}	1
1712	0126-2001-1680	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD FALIH AL IKHSAN"}	1
1713	0126-2001-1681	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M. FERO AMIRUDDIN"}	1
1714	0126-2001-1682	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AGUNG MAULANA SURBAKTI"}	1
1715	0126-2001-1683	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HERI VALDY"}	1
1716	0126-2001-1684	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD IQBAL"}	1
1717	0126-2001-1685	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMAD KEVIN RAJA YUSDAVA"}	1
1718	0126-2001-1686	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LINGGA ARA HIWANG"}	1
1719	0126-2001-1687	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LEONEL YOSPHIN NAIBAHO"}	1
1720	0126-2001-1688	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD LOUDY ARMANANTA"}	1
1721	0126-2001-1689	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD DZAKY"}	1
1722	0126-2001-1690	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD ROZAN ALFARISI"}	1
1723	0126-2001-1691	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIDHWAN AHMAD FARHANSYAH"}	1
1724	0126-2001-1692	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RYAN EFFENDI"}	1
1725	0126-2001-1693	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TAUFIQ HAMID RAHWANTO"}	1
1726	0126-2001-1694	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YUSUF YOSSE SIREGAR"}	1
1727	0126-2001-1695	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "WILDAN ZUHRIF AN-NABIL"}	1
1728	0126-2001-1696	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DZIBAN NABIL NINDAWARDANA"}	1
1729	0126-2001-1697	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TIMOTIUS KURNIAWAN ADHITAMA"}	1
1730	0126-2001-1698	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADITYA PUTRA GUMINTANG"}	1
1731	0126-2001-1699	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ENDINSYA NAUFAL YAAFI"}	1
1732	0126-2001-1700	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD MARTA"}	1
1733	0126-2001-1701	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MOH IQBAL IRHAM MAHFUDH"}	1
1734	0126-2001-1702	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MOHAMMAD ILHAM NAJMUDDIN"}	1
1735	0126-2001-1703	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NASHRULLOH MAHMUD HASAN"}	1
1736	0126-2001-1704	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PASHA SULTAN AL-THAF"}	1
1737	0126-2001-1705	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PRAYUGO UTOMO"}	1
1738	0126-2001-1706	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DANDY PEBRIAN NOOR"}	1
1739	0126-2001-1707	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALFA ANDRIYATNO"}	1
1740	0126-2001-1708	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARIF RAHMAN"}	1
1741	0126-2001-1709	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ASROY AHMAD FADLI DAULAY"}	1
1742	0126-2001-1710	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DAVYN MUHAMMAD FARRELL"}	1
1743	0126-2001-1711	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GENTUR CRISTIAN MANGUNKUSUMO SILALAHI"}	1
1744	0126-2001-1712	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LOUIS PANDU HARYO SUTRISNO"}	1
1745	0126-2001-1713	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JOSEF EVAN SIHALOHO"}	1
1746	0126-2001-1714	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ABDUL AZIZ"}	1
1747	0126-2001-1715	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADELIO IGNAZ SYAHPUTRA"}	1
1748	0126-2001-1716	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADETYA FADLUR RAHMAN"}	1
1749	0126-2001-1717	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADHIM NANDITYA PRABANJATI"}	1
1750	0126-2001-1718	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADIMAS KRISNA MUKTI SANTOSO"}	1
1751	0126-2001-1719	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AFNER SIRAIT"}	1
1752	0126-2001-1720	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AHMAD AKMAL ABRAR"}	1
1753	0126-2001-1721	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AIDIL FITRISYAH FADWI"}	1
1754	0126-2001-1722	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARYA BAGAS PRAMUDYA WINADI"}	1
1755	0126-2001-1723	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ABIYYU DZAKY ATHAYA YUDHESTA"}	1
1756	0126-2001-1724	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FIGO FADLILLAH ROSSI"}	1
1757	0126-2001-1725	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FASA MAULIDAN HAKIM"}	1
1758	0126-2001-1726	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD HUSNUL KHULUQI"}	1
1759	0126-2001-1727	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JOHANNES GOKMA PARMONANGAN TONDANG"}	1
1760	0126-2001-1728	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PRABU FARREL RAKHA"}	1
1761	0126-2001-1729	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MOH REDY PUTRA PARISKA"}	1
1762	0126-2001-1730	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ROYAN NUR SHALAFUDIN"}	1
1763	0126-2001-1731	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YANUAR LAZUARDY"}	1
1764	0126-2001-1732	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AKMAL RAFI HERLIAWAN"}	1
1765	0126-2001-1733	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANAMTA ARRUM SULISTYO AJI"}	1
1766	0126-2001-1734	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANANDA HIKMAWAN"}	1
1767	0126-2001-1735	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANDIKA YOGA YOGIANTARA TRIALDILA"}	1
1768	0126-2001-1736	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AOM MUHAMAD IMADUDIN"}	1
1769	0126-2001-1737	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARIQ HAEKAL"}	1
1770	0126-2001-1738	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARIYA PERMANA PUTRA"}	1
1771	0126-2001-1739	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARRYAN KURNIA SYAHPUTRA KAHAR"}	1
1772	0126-2001-1740	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AZIZ MIFTAH"}	1
1773	0126-2001-1741	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AZRIEL DIMAS FAHREZA"}	1
1774	0126-2001-1742	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BELVA BINTULU AJI"}	1
1775	0126-2001-1743	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MICHAEL HANBALI"}	1
1776	0126-2001-1744	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD DAFFA ASRIL"}	1
1777	0126-2001-1745	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DANDY ANANDA"}	1
1778	0126-2001-1746	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FAJRI IMRAN HABIB NASUTION"}	1
1779	0126-2001-1747	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DIMAS FEBRIAN MIRZADININGRAT"}	1
1780	0126-2001-1748	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD AL BAHRI"}	1
1781	0126-2001-1749	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YOHANES ARI PUTRA PANDAPOTAN"}	1
1782	0126-2001-1750	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HABIB ALI MUCHSIN FAIDZIN"}	1
1783	0126-2001-1751	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M NURUL HUDA"}	1
1784	0126-2001-1752	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SETYOKO BAYU FIRMANSYAH"}	1
1785	0126-2001-1753	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DIMAS NUGRAHA RIYADI"}	1
1786	0126-2001-1754	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MAULANA NOOR FAIQ AL FAROUQ"}	1
1787	0126-2001-1755	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FAREZI ADE NANDITO"}	1
1788	0126-2001-1756	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FAHMI AHMAD FADILAH"}	1
1789	0126-2001-1757	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HAFIZ KAUSAR"}	1
1790	0126-2001-1758	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD AFIF RAYHAN ARVANSYAH"}	1
1791	0126-2001-1759	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M RIZKI ASYAPII"}	1
1792	0126-2001-1760	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIO ALEXIUS MARBUN"}	1
1793	0126-2001-1761	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SHAKTI ANDARA PRATAMA"}	1
1794	0126-2001-1762	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALGHIFARI"}	1
1795	0126-2001-1763	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AL HUSEN"}	1
1796	0126-2001-1764	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARTHA PRATAMA SITINJAK"}	1
1797	0126-2001-1765	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DIMAS SULTAN IRAWAN"}	1
1798	0126-2001-1766	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALFARREL PUJA MUHAMMAD"}	1
1799	0126-2001-1767	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FEBRI SHAH INDRAWAN"}	1
1800	0126-2001-1768	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IBNU RAIHAN"}	1
1801	0126-2001-1769	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JEREMIAS OKTAVIANUS SITORUS"}	1
1802	0126-2001-1770	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DEVARA NAZWAN LUTHFI NURHIDAYAT"}	1
1803	0126-2001-1771	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RICCO CAHYA RAMADHAN"}	1
1804	0126-2001-1772	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YOHANNES NAIBAHO"}	1
1805	0126-2001-1773	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AKBAR MAULANA"}	1
1806	0126-2001-1774	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD FARHAN IRAHMI"}	1
1807	0126-2001-1775	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M. IMAM SAFE’I"}	1
1808	0126-2001-1776	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MAHESA PRIMA YOGA"}	1
1809	0126-2001-1777	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MARTIN BERLIANTA SIANIPAR"}	1
1810	0126-2001-1778	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MIRZA AWANRI SYAFIQULLAH"}	1
1811	0126-2001-1779	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD ILHAM"}	1
1812	0126-2001-1780	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M. RAFLY NAZARWAN"}	1
1813	0126-2001-1781	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAIHAN DWI NANDA"}	1
1814	0126-2001-1782	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD RIDHO RAMADHAN"}	1
1815	0126-2001-1783	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RICKI PIRNANDO"}	1
1816	0126-2001-1784	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SAMUEL MANIK"}	1
1817	0126-2001-1785	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "STEVANUS BEVAN"}	1
1818	0126-2001-1786	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMAD TEGAR ARDIANSYAH"}	1
1819	0126-2001-1787	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "WAPA AHMAD SURNA"}	1
1820	0126-2001-1788	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YOGIE ARMANDHONI HIDAYAT"}	1
1821	0126-2001-1789	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD YUDHA PRATAMA"}	1
1822	0126-2001-1790	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AHMAD ISTIQLAL ATHIAB"}	1
1823	0126-2001-1791	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD AKBAR RADEN PRAWIRA"}	1
1824	0126-2001-1792	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M. AL AZIZ"}	1
1825	0126-2001-1793	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M.IMAM DWI SAPUTRA"}	1
1826	0126-2001-1794	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M. KHOIRUN NADIR"}	1
1827	0126-2001-1795	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M ALDY GUSTANTO"}	1
1828	0126-2001-1796	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MAMAY KUSMAYADI"}	1
1829	0126-2001-1797	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMAD FARHAN"}	1
1830	0126-2001-1798	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M. FIRIZQI RAMADIAN"}	1
1831	0126-2001-1799	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD IVAN YAHYA PRASETYA"}	1
1832	0126-2001-1800	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUCHAMAD BILAL SYARIF PUDIN"}	1
1833	0126-2001-1801	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD AKBAR"}	1
1834	0126-2001-1802	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD AZZAM"}	1
1835	0126-2001-1803	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M. RIDHO FATHURRIFQY"}	1
1836	0126-2001-1804	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD ZIKRI ABDILLAH"}	1
1837	0126-2001-1805	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD RAFI RIZQULLAH"}	1
1838	0126-2001-1806	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RISKI APRIANDI"}	1
1839	0126-2001-1807	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SATRIA NOVENDRA"}	1
1840	0126-2001-1808	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SURYA APRIPURNOMO"}	1
1841	0126-2001-1809	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TEGUH GUSMANSYAH"}	1
1842	0126-2001-1810	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M. WIZKY HAQ"}	1
1843	0126-2001-1811	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AKBAR WARDHANA"}	1
1844	0126-2001-1812	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RADYA ARDHANA HANUGRAHA"}	1
1845	0126-2001-1813	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARIEF MADINA LINTANG"}	1
1846	0126-2001-1814	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BINTANG ULUL AZMI"}	1
1847	0126-2001-1815	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FARHAN MAULANA BAIHAQI"}	1
1848	0126-2001-1816	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FARHAN KURNIA SYAHPUTRA KAHAR"}	1
1849	0126-2001-1817	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FIRZA MAULANA"}	1
1850	0126-2001-1818	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GALANG VIRGIAWAN ADI SAPUTRA"}	1
1851	0126-2001-1819	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GILANG CAHYA PERMANA"}	1
1852	0126-2001-1820	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HAIDAR TAQY"}	1
1853	0126-2001-1821	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IMAM IQBAL SOBARI"}	1
1854	0126-2001-1822	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "INDIRA KHARISMA PUTRA"}	1
1855	0126-2001-1823	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "INDRA AOLIA NUGRAHA"}	1
1856	0126-2001-1824	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IQBAL AL HABSI MANULLANG"}	1
1857	0126-2001-1825	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JOSUA MILLANO PANDAPOTAN TAMPUBOLON"}	1
1858	0126-2001-1826	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAFIF PUTRA HADITAMA"}	1
1859	0126-2001-1827	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAFLI RIZKY SAPUTRA"}	1
1860	0126-2001-1828	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAMANDA PUTRA WIDYATARA"}	1
1861	0126-2001-1829	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DIO REDINATA"}	1
1862	0126-2001-1830	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIAN TRINOBETH PURBA"}	1
1863	0126-2001-1831	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DZIKRI ILHAM HABIBIE"}	1
1864	0126-2001-1832	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "I KOMANG ANDHIKA ANGGA PRATAMA"}	1
1865	0126-2001-1833	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANUGERAH AKMAL MAULANA"}	1
1866	0126-2001-1834	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BIMA DZUL FAJAR"}	1
1867	0126-2001-1835	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BIMA SAKTI DWI REYHAN SAPUTRA"}	1
1868	0126-2001-1836	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DANANG SETYAWAN"}	1
1869	0126-2001-1837	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DEYVAN ADI PRAKUSYA"}	1
1870	0126-2001-1838	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DHANI ARI SUSILO WIBOWO"}	1
1871	0126-2001-1839	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DICKY WAHYUDI"}	1
1872	0126-2001-1840	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DICO DZAKY DHAIFULLAH"}	1
1873	0126-2001-1841	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DIKO SANDIKA"}	1
1874	0126-2001-1842	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DOKLAS WILSON TARIGAN"}	1
1875	0126-2001-1843	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FARHAN ABROR HARIYANTO"}	1
1876	0126-2001-1844	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GUNAWAN BAYU ATMAJA"}	1
1877	0126-2001-1845	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HABIB MAULANA IBRAHIM"}	1
1878	0126-2001-1846	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BOBBY MASMUR GREGORIUS HUTAURUK"}	1
1879	0126-2001-1847	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IFAN HANIF FAHMI"}	1
1880	0126-2001-1848	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IHLAN MANSIS"}	1
1881	0126-2001-1849	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FANZA RACHSANDI"}	1
1882	0126-2001-1850	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YOSAFAT ANDRE SITUMEANG"}	1
1883	0126-2001-1851	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ZIDANE ALIF AKBAR"}	1
1884	0126-2001-1852	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M ANDRIANSYAH"}	1
1885	0126-2001-1853	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMAD KAVIN ARSYADA"}	1
1886	0126-2001-1854	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD FADHEL HIDAYAT"}	1
1887	0126-2001-1855	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NURRAHMAN ISTIGHFARI INSANISWARA"}	1
1888	0126-2001-1856	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IRFAN DWI NUGROHO"}	1
1889	0126-2001-1857	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KAHFI ADHA SALIK ISLAM"}	1
1890	0126-2001-1858	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KAMAL DIMAS NEGARA"}	1
1891	0126-2001-1859	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD FAISAL ARDAN"}	1
1892	0126-2001-1860	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MHD. RAIHAN"}	1
1893	0126-2001-1861	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD LUTFI"}	1
1894	0126-2001-1862	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD RAFI SYAUQI RAMADHAN"}	1
1895	0126-2001-1863	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAMADHANI GUSTI EKA PUTRA"}	1
1896	0126-2001-1864	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RASHIF MUTTAQIN"}	1
1897	0126-2001-1865	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RESTU DWI ARI ZULFIKAR"}	1
1898	0126-2001-1866	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIZKY ADRIANA FIRMANSYAH"}	1
1899	0126-2001-1867	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M TEGAR BINTA ASNAWI"}	1
1900	0126-2001-1868	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "VHITO ERIC ALFIANTO"}	1
1901	0126-2001-1869	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M. YUNUS AL FATH"}	1
1902	0126-2001-1870	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD NURZAJULI"}	1
1903	0126-2001-1871	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ABDIRA GYM WIJAYA"}	1
1904	0126-2001-1872	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ACHMAD RIDWAN"}	1
1905	0126-2001-1873	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AHMAD HIDAYAT HASYIM PAJDUANI"}	1
1906	0126-2001-1874	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AHMAD MUFIT"}	1
1907	0126-2001-1875	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALDA RANUM VIRGIAWAN"}	1
1908	0126-2001-1876	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BINTAR YUDISTIRA DARUPAKSI"}	1
1909	0126-2001-1877	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BIYAN RIZKY PERMANA"}	1
1910	0126-2001-1878	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FATHANDHIA DAFFA SUSANTO"}	1
1911	0126-2001-1879	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FARIZ RAZAN RABBANI"}	1
1912	0126-2001-1880	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FIRMAN HENDRYONO"}	1
1913	0126-2001-1881	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HUD SHALAHUDDIN"}	1
1914	0126-2001-1882	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IRGI FAZRI FAHREZI"}	1
1915	0126-2001-1883	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JHONASSEN MORIENTES SITUMORANG"}	1
1916	0126-2001-1884	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAHMAT HIDAYAT"}	1
1917	0126-2001-1885	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD IQBAL"}	1
1918	0126-2001-1886	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "THARIQ ABDUL JALIL"}	1
1919	0126-2001-1887	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KHOLIL IDRIS RITONGA"}	1
1920	0126-2001-1888	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LAURENSIUS AVEN MELVIN"}	1
1921	0126-2001-1889	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MAHMUD ABDUL HAKIM"}	1
1922	0126-2001-1890	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MHD RIZKY SYAHPUTRA"}	1
1923	0126-2001-1891	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD ALIF FATHUROHMAN"}	1
1924	0126-2001-1892	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD AMANDA AL KHAIR HSB"}	1
1925	0126-2001-1893	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NABIL MUKHLIS"}	1
1926	0126-2001-1894	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAYHAN AHMAD ZONATHAN"}	1
1927	0126-2001-1895	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TAUFIQ HILMI"}	1
1928	0126-2001-1896	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TIO SAPUTRA"}	1
1929	0126-2001-1897	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YUAN NIFER HARADA"}	1
1930	0126-2001-1898	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ACHMAD RAYVAL"}	1
1931	0126-2001-1899	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AGUNG BHASKARA"}	1
1932	0126-2001-1900	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANGGI DWI KURNIA"}	1
1933	0126-2001-1901	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANINDITO RIFKI DWI MUKTI"}	1
1934	0126-2001-1902	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ATHALLAH FARRELITAVIO"}	1
1935	0126-2001-1903	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DANIEL THRISTYANTA"}	1
1936	0126-2001-1904	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FAJAR BAKUH LUMAKSONO"}	1
1937	0126-2001-1905	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FAIKAR KAMALUDDIN"}	1
1938	0126-2001-1906	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "K FAZA FAUZAN NURRAHMAM"}	1
1939	0126-2001-1907	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GERALD KHANSA MUHAMMAD"}	1
1940	0126-2001-1908	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD HAFIZ YOZA"}	1
1941	0126-2001-1909	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD HAIKAL FIRZANA"}	1
1942	0126-2001-1910	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HAMZAH LAZUARDY ZULQISTHIE"}	1
1943	0126-2001-1911	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JACOB GIANDO HASIHOLAN MARBUN"}	1
1944	0126-2001-1912	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YURI KEMAL FATAH"}	1
1945	0126-2001-1913	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD THORIQ AL FATIH"}	1
1946	0126-2001-1914	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAYHAN FATIH PRAMUDYA"}	1
1947	0126-2001-1915	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMAD ALCHEM NURAVIAN PERMANA"}	1
1948	0126-2001-1916	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ASHMI HABLANI"}	1
1949	0126-2001-1917	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BREMI AL RIZKY"}	1
1950	0126-2001-1918	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANDIKA RAKRYAN MAHARDIKA"}	1
1951	0126-2001-1919	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALDORINO AULIA FADILLA"}	1
1952	0126-2001-1920	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MURSYID AHSAN MUFASIRIN"}	1
1953	0126-2001-1921	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD DAFFA ALGHIFARI"}	1
1954	0126-2001-1922	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FEBRI FIRMANSYAH"}	1
1955	0126-2001-1923	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD RAFLY ILHAMSYAH"}	1
1956	0126-2001-1924	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAFENDRA ALFARIZQI NUGROHO"}	1
1957	0126-2001-1925	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARI MAJID SONHAJI"}	1
1958	0126-2001-1926	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DANIEL CHRISTIAN BANGUN"}	1
1959	0126-2001-1927	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DENNIS YESAYA MAKATENGKENG"}	1
1960	0126-2001-1928	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DHIGMAYOGA RASETO AKBAR"}	1
1961	0126-2001-1929	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DIAN PUTRA PAMUNGKAS"}	1
1962	0126-2001-1930	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DIEMAS IBNUS PASEDJA"}	1
1963	0126-2001-1931	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DONNY MAREZA KURNIAWAN"}	1
1964	0126-2001-1932	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ELITE HOTMAN TALENTA SIRAIT"}	1
1965	0126-2001-1933	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ENDEK DAMIO PURBA"}	1
1966	0126-2001-1934	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FAJAR ALWI NURDIN"}	1
1967	0126-2001-1935	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FALAH KHARISMA NURAZIZ"}	1
1968	0126-2001-1936	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AKILLA FARRI SANTOSO"}	1
1969	0126-2001-1937	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARIF BUDISANTOSO"}	1
1970	0126-2001-1938	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MARIO ALFANDI WIRAWAN"}	1
1971	0126-2001-1939	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FIRDAUS BIMA FIRMANSYAH"}	1
1972	0126-2001-1940	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HABIB NUR SHOLEH"}	1
1973	0126-2001-1941	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HANDIKA RIZKI PRATAMA"}	1
1974	0126-2001-1942	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HASYIM HALIM ABDURRAHMAN"}	1
1975	0126-2001-1943	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IBRAHIM ACHMAD YAMIN"}	1
1976	0126-2001-1944	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IKMAL MUGHNI KURNIASYAH"}	1
1977	0126-2001-1945	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ILHAM HUGO ANANTAMA"}	1
1978	0126-2001-1946	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IMAN SETIAJI"}	1
1979	0126-2001-1947	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IRFAAN FADHLULLAH"}	1
1980	0126-2001-1948	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MARCELINUS IRVAN JUANTO"}	1
1981	0126-2001-1949	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JIMMI JAYA GUNAWAN NADAPDAP"}	1
1982	0126-2001-1950	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KMS SYAHRUL HUDA"}	1
1983	0126-2001-1951	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KEVIN IMAM SATRIA"}	1
1984	0126-2001-1952	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KEVIN AUGUST HIZKIA S"}	1
1985	0126-2001-1953	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KIRANA HERDINRODIA"}	1
1986	0126-2001-1954	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KRISNA ARYADUTA"}	1
1987	0126-2001-1955	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M. LAM ALIEF RAHMANSYAH"}	1
1988	0126-2001-1956	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LINGGA DESTIA DARMAWAN"}	1
1989	0126-2001-1957	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LIUS PARULIAN SITOMPUL"}	1
1990	0126-2001-1958	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MICHAEL TIMOTHY SITORUS"}	1
1991	0126-2001-1959	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MIKOLAS JOHAN UNTUNG SINAGA"}	1
1992	0126-2001-1960	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KADEK REKHA AGUSTHA"}	1
1993	0126-2001-1961	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M. SAKHIYA HASAN"}	1
1994	0126-2001-1962	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "I PUTU YOGA CAHYADI PUTRA"}	1
1995	0126-2001-1963	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KRISNA ZAIN"}	1
1996	0126-2001-1964	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M. ZHAFRAN ARRAFI ANWAR"}	1
1997	0126-2001-1965	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD AFIF AL IRSAD"}	1
1998	0126-2001-1966	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIVAL ALROZI"}	1
1999	0126-2001-1967	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD BINTANG WIBISONO"}	1
2000	0126-2001-1968	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD DAFFA ATHAYA"}	1
2001	0126-2001-1969	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD DAFFA FAISHAL"}	1
2002	0126-2001-1970	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MOHAMMAD FARID"}	1
2003	0126-2001-1971	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD SHULTON AL AMIN"}	1
2004	0126-2001-1972	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD MARCHELL ERNIZA PUTRA"}	1
2005	0126-2001-1973	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NUKU WIJAYA MARSAOLY"}	1
2006	0126-2001-1974	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "OKAL PRATAMA RAHILLAH"}	1
2007	0126-2001-1975	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "OTNIEL GANDAWASTRATMODJO"}	1
2008	0126-2001-1976	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ROY JAYA PASARIBU"}	1
2009	0126-2001-1977	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ROGATE PHILIA PUTRA SITOMPUL"}	1
2010	0126-2001-1978	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RADITYA WISNU WARDHANA"}	1
2011	0126-2001-1979	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RADYATAMA NUGRAHA"}	1
2012	0126-2001-1980	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD RAIHAN ALFARIJ"}	1
2013	0126-2001-1981	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAJA EDWARD SIHITE"}	1
2014	0126-2001-1982	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAKA RADITHYA PRADHANA"}	1
2015	0126-2001-1983	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "REFFITHO CHONNERY"}	1
2016	0126-2001-1984	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "REYHAN NUGRAHA"}	1
2017	0126-2001-1985	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIFKY JUSTIAN"}	1
2018	0126-2001-1986	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RISON SIREGAR"}	1
2019	0126-2001-1987	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD RIZAL FANANI"}	1
2020	0126-2001-1988	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIZKI ABADI SIMANJUNTAK"}	1
2021	0126-2001-1989	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MOHAMMAD ROBITH IRCHAM ASYHARI"}	1
2022	0126-2001-1990	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RONY FRITZ NATANAEL BAKARA"}	1
2023	0126-2001-1991	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AKHMAD ABRAR AL-ARSYI HENDANA"}	1
2024	0126-2001-1992	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADITYA PRATAMA PUTRA"}	1
2025	0126-2001-1993	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALMAS ERWIAN CAHYA"}	1
2026	0126-2001-1994	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALMAS RIZKI NAUFAL"}	1
2027	0126-2001-1995	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANANDA ARBA PAMUNGKAS"}	1
2028	0126-2001-1996	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANDRE ISKANDAR SIBATUARA"}	1
2029	0126-2001-1997	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AQILA TUNJUNG CHANDRA"}	1
2030	0126-2001-1998	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AHMAD RIDZAL FATHAN"}	1
2031	0126-2001-1999	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARIQ HANDY PRATAMA"}	1
2032	0126-2001-2000	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AWAN IRAWAN"}	1
2033	0126-2001-2001	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD AZYUMIARDI AZRA"}	1
2034	0126-2001-2002	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BAGAS NABILA"}	1
2035	0126-2001-2003	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BIGSANRO BANJARNAHOR"}	1
2036	0126-2001-2004	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BIMA ROFI"}	1
2037	0126-2001-2005	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DAFFA JATMIKO"}	1
2038	0126-2001-2006	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DANIEL GILBERT H PARDEDE"}	1
2039	0126-2001-2007	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DIMAS RIZKI SETIAWAN"}	1
2040	0126-2001-2008	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "EFRIANTO"}	1
2041	0126-2001-2009	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FAISAL AFRIANDI"}	1
2042	0126-2001-2010	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FAISAL FATHURRAHMAN"}	1
2043	0126-2001-2011	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FARIS RAMADHAN YUSMAN"}	1
2044	0126-2001-2012	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SYAHRI FEBRIANSYAH"}	1
2045	0126-2001-2013	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FYSKHY RAVAEL ERVANDRI"}	1
2046	0126-2001-2014	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GALIH ANNARTIWANG"}	1
2047	0126-2001-2015	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GHOZI DHIYA ULHAQ"}	1
2048	0126-2001-2016	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IVAN REZKI SAHDANI LOI"}	1
2049	0126-2001-2017	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "WILDAN MAULANA AKBAR"}	1
2050	0126-2001-2018	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD ARSYAD NAWAWI"}	1
2051	0126-2001-2019	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD DHIO EKA MAHENDRA"}	1
2052	0126-2001-2020	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SETO HARYADI"}	1
2053	0126-2001-2021	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANDRE MUAL MARGANDA SIHOTANG"}	1
2054	0126-2001-2022	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SERGIO LAZLO STEVANUS"}	1
2055	0126-2001-2023	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SYAIFUL PRADANA"}	1
2056	0126-2001-2024	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TARIKH BILHADI"}	1
2057	0126-2001-2025	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TAUFIQ NUR RAHMAN"}	1
2058	0126-2001-2026	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TIGOR PANGIHUTAN SIANIPAR"}	1
2059	0126-2001-2027	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "WISNU SURYA NARENDRA"}	1
2060	0126-2001-2028	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YOSEP SALMAN ALFARIZI"}	1
2061	0126-2001-2029	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YOSIA HAMONANGAN NAINGGOLAN"}	1
2062	0126-2001-2030	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "I MADE YUDI MERTHA ANTARA"}	1
2063	0126-2001-2031	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YULIANTO PARULIAN MARPAUNG"}	1
2064	0126-2001-2032	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADAM MUHAMMAD"}	1
2065	0126-2001-2033	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD ADITYA KAMALLAH"}	1
2066	0126-2001-2034	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AHMAD ROSYAD IMANSYAH"}	1
2067	0126-2001-2035	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARREZI ALHAZRAN"}	1
2068	0126-2001-2036	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AZIS BRAMANTYO SUSILO"}	1
2069	0126-2001-2037	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DANDI ADE PRASETYA"}	1
2070	0126-2001-2038	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DAZNIAR KRISNOAJI"}	1
2071	0126-2001-2039	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DIOVAN FITRA PAMUJI"}	1
2072	0126-2001-2040	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DONI WAHYU RAMADHAN"}	1
2073	0126-2001-2041	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FAISAL AMRULLAH PRATAMA"}	1
2074	0126-2001-2042	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KGS. RAVICO ROBBY FIRMANSYAH"}	1
2075	0126-2001-2043	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FRAHAZSYAH AMMIQIE ASH SHIDIQIE"}	1
2076	0126-2001-2044	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARYAPUTRA GANDEWA KARTASASMITA"}	1
2077	0126-2001-2045	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HALILINTAR HARDANI"}	1
2078	0126-2001-2046	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HERYANDA AQSHADIOVA"}	1
2079	0126-2001-2047	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LUTFAN SYAHRULLAH"}	1
2080	0126-2001-2048	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD LUTHFI AL MUFARRIJI"}	1
2081	0126-2001-2049	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NAUFANDI MAJID"}	1
2082	0126-2001-2050	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD YAZID BAIHAQI"}	1
2083	0126-2001-2051	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD HELMY ZAKARIA"}	1
2084	0126-2001-2052	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BRAMASTA MIRZA MAHENDRA"}	1
2085	0126-2001-2053	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MIRZA NAZARUDIN ADZANI"}	1
2086	0126-2001-2054	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD RAFI FAADHILAH"}	1
2087	0126-2001-2055	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD RAFI NUR IMAN"}	1
2088	0126-2001-2056	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUKHLIS IBRAHIM"}	1
2089	0126-2001-2057	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUZHAKI SUHARWIYONO"}	1
2090	0126-2001-2058	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NANDA DWI FEBRIAN"}	1
2091	0126-2001-2059	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAMANDA BANU PRAKASA"}	1
2092	0126-2001-2060	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD RIFKY PRADANA"}	1
2093	0126-2001-2061	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RONI HANAFI WIJAYA"}	1
2094	0126-2001-2062	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SAMUEL FRITZ MORENO SIHOMBING"}	1
2095	0126-2001-2063	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BAGUS SATRIA PUTRA"}	1
2096	0126-2001-2064	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SENJA SYAHRIAL"}	1
2097	0126-2001-2065	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TIMOTIUS RAMOT"}	1
2098	0126-2001-2066	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TITO WIJAYANTO"}	1
2099	0126-2001-2067	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "WAHYU AGUNG BUDI ALAMSYAH"}	1
2100	0126-2001-2068	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SULTAN AULIA RAHMAT"}	1
2101	0126-2001-2069	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NGURAH ARYA YOGA PRAMESWARA"}	1
2102	0126-2001-2070	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ZAIN ALWAN WIMA IRFANI"}	1
2103	0126-2001-2071	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ASEP HIDAYAT"}	1
2104	0126-2001-2072	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AGUNG MULYO HUSODO"}	1
2105	0126-2001-2073	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AIRLANGGA ARIO PAMUNGKAS"}	1
2106	0126-2001-2074	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AKMAL SYAROFI JAUHAR"}	1
2107	0126-2001-2075	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALGHIFARI MAHFUDZ RUMI"}	1
2108	0126-2001-2076	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALLWIN ANDREAS"}	1
2109	0126-2001-2077	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALTHAFRI KHALIL HAFIS"}	1
2110	0126-2001-2078	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BINTANG RAMADHAN LUCKY AMAZA"}	1
2111	0126-2001-2079	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANAS FIKRI MAKARIM"}	1
2112	0126-2001-2080	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANNAS HILMY FARRASSANY"}	1
2113	0126-2001-2081	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARAFI ISWARA"}	1
2114	0126-2001-2082	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARBA NUR WAHYU RAMDHANI"}	1
2115	0126-2001-2083	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARSALAN GHIFARI KANDUNG SONDA"}	1
2116	0126-2001-2084	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARZAQ YUSRA"}	1
2117	0126-2001-2085	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "A. M. ASLAN AFIF. A"}	1
2118	0126-2001-2086	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AZER FAUZAN ISYQ"}	1
2119	0126-2001-2087	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BAGAS WICAKSANA ADI"}	1
2120	0126-2001-2088	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BAGUS SANTOSO"}	1
2121	0126-2001-2089	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BRILYAN RIZKY NUGROHO"}	1
2122	0126-2001-2090	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BRYLIAN DANA PRANANCA SIAHAAN"}	1
2123	0126-2001-2091	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "CHRISTIAN VIERI"}	1
2124	0126-2001-2092	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "CHRISTIAN PURBA"}	1
2125	0126-2001-2093	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DANENDRA ANGGARA PUTRA"}	1
2126	0126-2001-2094	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DANI SHARIF WIJANARKO"}	1
2127	0126-2001-2095	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DANIZ HANS JURGEN VENUEL SAMOSIR"}	1
2128	0126-2001-2096	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "WIDJAYA PRATAMA"}	1
2129	0126-2001-2097	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DUTO ADI NUGROHO"}	1
2130	0126-2001-2098	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FACHRIE HADI"}	1
2131	0126-2001-2099	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FAIZAL RIKAZ AL MUNTAQO"}	1
2132	0126-2001-2100	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FARHAN KHAIRUSSIDQI"}	1
2133	0126-2001-2101	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALFIANSYAH FIRDHANI"}	1
2134	0126-2001-2102	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GERALD DWIANANDA PUTRA"}	1
2135	0126-2001-2103	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IMAN FIRMANSYAH"}	1
2136	0126-2001-2104	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AHMAD CHOIRUL MUNA"}	1
2137	0126-2001-2105	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YOGIE SURYA ADYTAMA"}	1
2138	0126-2001-2106	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JORDAN AHMAD YASIR"}	1
2139	0126-2001-2107	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JUNDI AL FIKRI"}	1
2140	0126-2001-2108	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KELANA EZRA PRADIPTA KUSUMAH"}	1
2141	0126-2001-2109	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GABRIEL KORESY SILALAHI"}	1
2142	0126-2001-2110	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DIRGA PERMANA"}	1
2143	0126-2001-2111	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BRIAN RAMADHAN PRAMASUDI"}	1
2144	0126-2001-2112	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "REYSANDRO NATHANAEL"}	1
2145	0126-2001-2113	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DAFFA SYABANI RIDHALLAH"}	1
2146	0126-2001-2114	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIZALDI FAUZAN NUGRAHA"}	1
2147	0126-2001-2115	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIZAL WAHYU FEBRYAN"}	1
2148	0126-2001-2116	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIZKY EKA PURNAMA"}	1
2149	0126-2001-2117	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NUR HUDA FATKHUR ROCHMAN"}	1
2150	0126-2001-2118	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FAKHRUL ROZI"}	1
2151	0126-2001-2119	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD IHSANUL AMAL"}	1
2152	0126-2001-2120	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "STEPHEN SURYO WIDJOYO"}	1
2153	0126-2001-2121	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD SYAUQI FIRDAUS"}	1
2154	0126-2001-2122	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ZAINUL ROHIM TEGAR AZHARI"}	1
2155	0126-2001-2123	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANDRE TINAMBUNAN"}	1
2156	0126-2001-2124	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD ALFIAN DARMAWAN"}	1
2157	0126-2001-2125	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD NUR FAUZI"}	1
2158	0126-2001-2126	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD NAUFAL"}	1
2159	0126-2001-2127	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NAZWAN HAFIZ FIRDAUS"}	1
2160	0126-2001-2128	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NURFADILLAH MUHAMMAD"}	1
2161	0126-2001-2129	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADAM MAWARJI"}	1
2162	0126-2001-2130	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SATRIO YUDOYONO"}	1
2163	0126-2001-2131	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FASELSAKTI IFOLALA JOHANES LAIA"}	1
2164	0126-2001-2132	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALFIKRI IHSAN"}	1
2165	0126-2001-2133	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IMAM CAHYO BASKORO"}	1
2166	0126-2001-2134	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD NAUFAL ASH SHIDQY"}	1
2167	0126-2001-2135	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NATHANIEL JANUARDO SIMARMATA"}	1
2168	0126-2001-2136	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAMA MADYA UTAMA"}	1
2169	0126-2001-2137	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SANDI BILLY"}	1
2170	0126-2001-2138	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SYARIF HIDAYATULLAH"}	1
2171	0126-2001-2139	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ABDURRAHMAN HAMID"}	1
2172	0126-2001-2140	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AHMAD NURUS SIFA"}	1
2173	0126-2001-2141	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AZIS DHAVA PUTRANTO"}	1
2174	0126-2001-2142	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IRSYAD FARHAN SETYAWARDHANA"}	1
2175	0126-2001-2143	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD RAYHAN RIZALDI"}	1
2176	0126-2001-2144	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RENDI SATRIA WICAKSANA"}	1
2177	0126-2001-2145	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAFI BINTANG PERMANA"}	1
2178	0126-2001-2146	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YOSE RIZAL MAULANA"}	1
2179	0126-2001-2147	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YUSUF AL HAQ MAULANA"}	1
2180	0126-2001-2148	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AHMAD AFANDI"}	1
2181	0126-2001-2149	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AHMADA SAHLUL ILHAMI"}	1
2182	0126-2001-2150	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AQSHA THIO MAULANA GIBRAN"}	1
2183	0126-2001-2151	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BAGUS WAHYU UTOMO"}	1
2184	0126-2001-2152	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DANU NURHAQI BARASETO"}	1
2185	0126-2001-2153	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DWI ERFAN ARLIANTO"}	1
2186	0126-2001-2154	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GARUDA DANADYAKSA"}	1
2187	0126-2001-2155	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ILHAM ZUHRI"}	1
2188	0126-2001-2156	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MOCHAMAD RAFI"}	1
2189	0126-2001-2157	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HUDZAIFAH AHNAF"}	1
2190	0126-2001-2158	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD RAIHAN MAULANA"}	1
2191	0126-2001-2159	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIESTIAN RAKHA ROKHMAD"}	1
2192	0126-2001-2160	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ACHMAD FERRYANTO"}	1
2193	0126-2001-2161	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SEPTIAN CAHYO NUGROHO"}	1
2194	0126-2001-2162	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SYAH LANANG YUSSUFI"}	1
2195	0126-2001-2163	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MICHAEL JORDAN HUTABARAT"}	1
2196	0126-2001-2164	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M EDO SAIFULLOH NOTONEGORO"}	1
2197	0126-2001-2165	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M SEPTA AJI MIARSA"}	1
2198	0126-2001-2166	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SIFANUR HIDAYAT"}	1
2199	0126-2001-2167	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARYA RAMADAN"}	1
2200	0126-2001-2168	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FERDINAND"}	1
2201	0126-2001-2169	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FIKRUL RAMADHAN ARDES"}	1
2202	0126-2001-2170	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AHMAD HABIBULLAH"}	1
2203	0126-2001-2171	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HAFIDZ ZIAD ISLAMI"}	1
2204	0126-2001-2172	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "WEDRI ANGADZA"}	1
2205	0126-2001-2173	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD ATTILASYACH"}	1
2206	0126-2001-2174	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD DWI CAHYA"}	1
2207	0126-2001-2175	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MOHAMAD FAZRI NURCAHYA"}	1
2208	0126-2001-2176	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD KHAIRUL IMAM"}	1
2209	0126-2001-2177	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IRSYAD FADHLURRAHMAN"}	1
2210	0126-2001-2178	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MAULANA DHARMA FIKRI"}	1
2211	0126-2001-2179	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD MEIRIZKY HUSADA"}	1
2212	0126-2001-2180	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MOHAMAD FACHREQI RISNANTO"}	1
2213	0126-2001-2181	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M. ALFARIS"}	1
2214	0126-2001-2182	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PUTERA ANUGERAH YUSJAYA"}	1
2215	0126-2001-2183	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIVALDO DECAPRIO"}	1
2216	0126-2001-2184	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HAFIZ IRSYAD"}	1
2217	0126-2001-2185	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FERDIAN FEBRIYANTO"}	1
2218	0126-2001-2186	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "WILLY FERNANDO SIMBOLON"}	1
2219	0126-2001-2187	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SYUHUD ALFADHOL"}	1
2220	0126-2001-2188	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD FAREL PUTRA ANANTA"}	1
2221	0126-2001-2189	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M. IQBAL SAPTIAWAN"}	1
2222	0126-2001-2190	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD IKHSAN"}	1
2223	0126-2001-2191	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MOHAMMAD RIZKY FADILLAH BAGUS PRATAMA PUTRA"}	1
2224	0126-2001-2192	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUKTI DHARMAWAN"}	1
2225	0126-2001-2193	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PALTI RAJA MANURUNG"}	1
2226	0126-2001-2194	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M RASYID AKMALDI"}	1
2227	0126-2001-2195	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIVAN ANWAR LIBERTY SIDABUTAR"}	1
2228	0126-2001-2196	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ROFI AGUSTI AKBAR FANIZAR"}	1
2229	0126-2001-2197	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ZAIDAN ZAKI RIZQULLOH"}	1
2230	0126-2001-2198	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUAMMAR ZACKY NASUTION"}	1
2231	0126-2001-2199	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADHE REYNALDI OKTAVIANSYAH"}	1
2232	0126-2001-2200	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADIB RANGGA ADI WIDYA"}	1
2233	0126-2001-2201	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALFIN FADILAH"}	1
2234	0126-2001-2202	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARSA FAWWAZIE"}	1
2235	0126-2001-2203	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FRANS JONATHAN MATONDANG"}	1
2236	0126-2001-2204	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD KHALIFAH BUWANA YUDA PRAJA"}	1
2237	0126-2001-2205	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALVIN CHRISTOFER PARDEDE"}	1
2238	0126-2001-2206	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RISKI ARIFIAN"}	1
2239	0126-2001-2207	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD FAHZA RAMADHAN"}	1
2240	0126-2001-2208	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "THARIQ HANIEF SHIDQI"}	1
2241	0126-2001-2209	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ZAIN AKBAR RIVALDHY"}	1
2242	0126-2001-2210	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ZHAFRAN ACHMAD MUWAFFAQY"}	1
2243	0126-2001-2211	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD ATHAYA AQSYAWIJAYA"}	1
2244	0126-2001-2212	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DAMARIS ADI WASKITHO"}	1
2245	0126-2001-2213	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD HANIF DARMAWAN"}	1
2246	0126-2001-2214	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ILHAM NABIEL SETYABUDI"}	1
2247	0126-2001-2215	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MOCHAMMAD IQBAL FIRMANSYAH"}	1
2248	0126-2001-2216	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD NAUFAL AUSHAF"}	1
2249	0126-2001-2217	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAJA PARMONANG MANURUNG"}	1
2250	0126-2001-2218	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ZHARFAN GHANA"}	1
2251	0126-2001-2219	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADRIAN DHANI TYAN MAHADIKA"}	1
2252	0126-2001-2220	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AUGUSTA DARRELL SULISTIO"}	1
2253	0126-2001-2221	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ULUL AZMI"}	1
2254	0126-2001-2222	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JIHAD WAHID ROMADHON"}	1
2255	0126-2001-2223	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NABIL BIOPARI PILLI"}	1
2256	0126-2001-2224	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RACHMAD RIZKY FIRDAUS"}	1
2257	0126-2001-2225	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALFARIZAN DANUR PRIATAMA"}	1
2258	0126-2001-2226	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FERDINAND FAHRUL ADHA"}	1
2259	0126-2001-2227	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YUDHI SETIADI"}	1
2260	0126-2001-2228	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "TOMMY HARYANTO"}	1
2261	0126-2001-2229	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ZAKI MAULANA HIDAYAT"}	1
2262	0126-2001-2230	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADI NUR HAQQI"}	1
2263	0126-2001-2231	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AHMAD JAUHARUL FUAD"}	1
2264	0126-2001-2232	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M. FARHAN ARIF"}	1
2265	0126-2001-2233	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HANIF RAHMAN SHIDIQ"}	1
2266	0126-2001-2234	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ILDAN DANUL SYAHRONI"}	1
2267	0126-2001-2235	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD NAUVAL AL JOPANY BEY"}	1
2268	0126-2001-2236	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RANGGA DHIMAS RADITHYA MULYADI"}	1
2269	0126-2001-2237	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YOGA ARYA PRATAMA"}	1
2270	0126-2001-2238	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANNAS FURQON MAHDALI"}	1
2271	0126-2001-2239	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AL HADIID"}	1
2272	0126-2001-2240	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AULIA RAMADHANA ALIFIANDA"}	1
2273	0126-2001-2241	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALVITO DWINOVAN WIBOWO"}	1
2274	0126-2001-2242	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AMSAL SINAMBELA"}	1
2275	0126-2001-2243	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANDREAS RYAN CAHYO KARTIKO"}	1
2276	0126-2001-2244	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BAGASKARA ANANDAYUTYA"}	1
2277	0126-2001-2245	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "CITRA TRILAKSANA"}	1
2278	0126-2001-2246	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GIBRAN BAHTIAR"}	1
2279	0126-2001-2247	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JACKY AHMAD GIFFARI"}	1
2280	0126-2001-2248	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JAMIL HAFIZH"}	1
2281	0126-2001-2249	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MOCHAMMAD ALDYAN NUR CAHYADI"}	1
2282	0126-2001-2250	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD FIKRI RIZKI"}	1
2283	0126-2001-2251	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD NADIFH"}	1
2284	0126-2001-2252	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NAUFAL AIMAN MADANI"}	1
2285	0126-2001-2253	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NAUFAL DZAKI ALFAKHRI"}	1
2286	0126-2001-2254	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIDHWAN ARDI MAHDIYANTORO"}	1
2287	0126-2001-2255	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMAD EMIL HERMANSYAH"}	1
2288	0126-2001-2256	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FAIZUN FAUWAZ EL MUHAMMADY"}	1
2289	0126-2001-2257	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IGNATIUS EVAN WIBISONO"}	1
2290	0126-2001-2258	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD BUSYRO DIIN"}	1
2291	0126-2001-2259	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ABBIYU IHSAN MAHDI"}	1
2292	0126-2001-2260	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DIAN WIRA SATYA SIRAIT"}	1
2293	0126-2001-2261	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD HILMI YUDIPUTRA"}	1
2294	0126-2001-2262	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PRIMA DITYA HARTOKO"}	1
2295	0126-2001-2263	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANDRE VALENTCIUS PANE"}	1
2296	0126-2001-2264	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AZMI FATHURRAHMAN"}	1
2297	0126-2001-2265	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DIONISIUS CAREL RAHADIANTORO"}	1
2298	0126-2001-2266	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD RAFID ARIA KHALFANI"}	1
2299	0126-2001-2267	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIFKY RIZKULLAH FAHMI"}	1
2300	0126-2001-2268	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD AR-RAZI ALIFIANSYAH"}	1
2301	0126-2001-2269	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD FATHURRAHMAN"}	1
2302	0126-2001-2270	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD FATIH ZHAFRAN"}	1
2303	0126-2001-2271	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FAVIAN FAIRUZ ALSA"}	1
2304	0126-2001-2272	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD FELIX FAJAR"}	1
2305	0126-2001-2273	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FHADYL MAHENDRA Y.T"}	1
2306	0126-2001-2274	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MOHAMAD FIDO"}	1
2307	0126-2001-2275	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FIKRI AVICENA AL-FARABI"}	1
2308	0126-2001-2276	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FIKRI ANANDWIKA HAMDANI"}	1
2309	0126-2001-2277	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FIQHI ATHIFIYAH SOBHRI"}	1
2310	0126-2001-2278	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FRANSISKUS FEBRIAN MANURUNG"}	1
2311	0126-2001-2279	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GALANG PANGESTU PRAWIRA"}	1
2312	0126-2001-2280	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GHANI WIDYATNA RESWARA"}	1
2313	0126-2001-2281	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HAADY ATALLAH"}	1
2314	0126-2001-2282	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HANANTYO DIAN UTOMO"}	1
2315	0126-2001-2283	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HANIF SETYA HANANDITA"}	1
2316	0126-2001-2284	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD AKIL HAQ"}	1
2317	0126-2001-2285	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HASAN FAIZAL WILDAN"}	1
2318	0126-2001-2286	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD HIFZHON SYARIF. HR"}	1
2319	0126-2001-2287	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IFRAN N. SAH PUTRA SIDAURUK"}	1
2320	0126-2001-2288	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ILHAM BAGUS PRATAMA"}	1
2321	0126-2001-2289	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IMANUEL ANDERSON GALLA"}	1
2322	0126-2001-2290	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IQBAL NUR ARIF"}	1
2323	0126-2001-2291	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IQBAL YUNANDA PUTRA"}	1
2324	0126-2001-2292	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "IRFAN AFRINALDI SAPUTRA"}	1
2325	0126-2001-2293	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JESAYA MARCEL GLORYUS"}	1
2326	0126-2001-2294	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "JOY HULMAN HUTASOIT"}	1
2327	0126-2001-2295	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KRISNA"}	1
2328	0126-2001-2296	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "LIFFAH ARDY SYAHHERTIAN"}	1
2329	0126-2001-2297	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD AKBAR"}	1
2330	0126-2001-2298	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD MAHDY FAIZ"}	1
2331	0126-2001-2299	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MARTIN LUHUT"}	1
2332	0126-2001-2300	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD WAHYU"}	1
2333	0126-2001-2301	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MICHAEL NOVA IRAWAN"}	1
2334	0126-2001-2302	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M. ARIEF WIDYANTO"}	1
2335	0126-2001-2303	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD RIZIQ MUTTAQIN"}	1
2336	0126-2001-2304	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MOCHAMAD YUSUF HIDAYAT"}	1
2337	0126-2001-2305	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NASHRUL KAMIL HYA"}	1
2338	0126-2001-2306	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NICODEMUS TJAYADI"}	1
2339	0126-2001-2307	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NUR MUHAMMAD IQBAL"}	1
2340	0126-2001-2308	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAHIMUL RAZAQ"}	1
2341	0126-2001-2309	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RAFI RIVALDI AZHAR"}	1
2342	0126-2001-2310	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RADO PAUL ALFREDO PURBA"}	1
2343	0126-2001-2311	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KAMIGAMA TANGI SATMOKO"}	1
2344	0126-2001-2312	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PAROHON TEOFILUS SIMANJUNTAK"}	1
2345	0126-2001-2313	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ABDUL FAT-HAN ISMAIL"}	1
2346	0126-2001-2314	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD AIMAN KAMIL HARAHAP S.PSI"}	1
2347	0126-2001-2315	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD DUTA ALAMSYAH"}	1
2348	0126-2001-2316	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALDEBARAN"}	1
2349	0126-2001-2317	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALTHA ANGSANA DEWA"}	1
2350	0126-2001-2318	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARFFAN ATH THARRIQ"}	1
2351	0126-2001-2319	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARIJUDDIN ADI PRAYOGA"}	1
2352	0126-2001-2320	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARMAN JEREMY HADIANTO SINAGA"}	1
2353	0126-2001-2321	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BAGAS MAHARDIKA MULYADI"}	1
2354	0126-2001-2322	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BHANU WIDYADANA"}	1
2355	0126-2001-2323	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BIMA DWI NUR AZIZ"}	1
2356	0126-2001-2324	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "CLEOSANTO HARISAMUDRA"}	1
2357	0126-2001-2325	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DARWIN CITRAJAYA"}	1
2358	0126-2001-2326	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIZQI DIAZ SURYA"}	1
2359	0126-2001-2327	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DONNY SYAPUTRA"}	1
2360	0126-2001-2328	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ELZAN FAIQAL HUDHA"}	1
2361	0126-2001-2329	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD FACHRI DAHNIAL"}	1
2362	0126-2001-2330	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD AIDIL FAJRI"}	1
2363	0126-2001-2331	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD FIKRI HIDAYAT"}	1
2364	0126-2001-2332	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GUSTI MUHAMMAD BINTANG"}	1
2365	0126-2001-2333	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HAFIDZ HANIFAN YUDHISTIRA"}	1
2366	0126-2001-2334	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HAMID NUR MUKHLIS"}	1
2367	0126-2001-2335	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HARVAN SINUKABAN"}	1
2368	0126-2001-2336	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD HAWI QABUS ABIYYI"}	1
2369	0126-2001-2337	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD HAYYU ALAM"}	1
2370	0126-2001-2338	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M HILMAN IMAN SAKTI"}	1
2371	0126-2001-2339	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD ROYHAN FERDIANSYAH"}	1
2372	0126-2001-2340	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HABIB ABDURRAHMAN"}	1
2373	0126-2001-2341	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD KHUZAMY"}	1
2374	0126-2001-2342	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "NIZARD MAULANA PRASETYO AJI"}	1
2375	0126-2001-2343	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "WAHID NURRASYID"}	1
2376	0126-2001-2344	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADITYA NURYAN PUTRA"}	1
2377	0126-2001-2345	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BERRI PRAYOGA"}	1
2378	0126-2001-2346	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "PUTU ANGGA DISTRAYOGA"}	1
2379	0126-2001-2347	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "REYHAN FARAS PRAYITNO"}	1
2380	0126-2001-2348	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIADHI ILMAM KASYFI"}	1
2381	0126-2001-2349	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIDHO BAIHAQQI"}	1
2382	0126-2001-2350	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIFQI PATRA SYANDANA"}	1
2383	0126-2001-2351	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIFQI ARDI PRATAMA"}	1
2384	0126-2001-2352	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RIFQIE AULIA DEWANGGA"}	1
2385	0126-2001-2353	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SALDI RAMDANI"}	1
2386	0126-2001-2354	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SALOMO GEORGE FERNANDO"}	1
2387	0126-2001-2355	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SENO WAHYUSANTOSO"}	1
2388	0126-2001-2356	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "WANDANIEL SIMANULLANG"}	1
2389	0126-2001-2357	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "REZA JOHANNES SINAGA"}	1
2390	0126-2001-2358	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SYAHLAN NAUFAL FRIDAYANTO"}	1
2391	0126-2001-2359	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YESAYA MANALU"}	1
2392	0126-2001-2360	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FADILLAH WILLIS TRIYAYUDA"}	1
2393	0126-2001-2361	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YUFANDA PURNAMA PUTRA"}	1
2394	0126-2001-2362	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD ZHILLAN ZAKIYYAN"}	1
2395	0126-2001-2363	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD ABDEL HAFIZ"}	1
2396	0126-2001-2364	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ADITYA PRAMODA RAMADHAN"}	1
2397	0126-2001-2365	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "AHMAD WAHID IDHOMI"}	1
2398	0126-2001-2366	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ALAN BIMANTARA"}	1
2399	0126-2001-2367	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANANDA FAJAR SUBAKHTI"}	1
2400	0126-2001-2368	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GINANJAR KARTA SASMITA"}	1
2401	0126-2001-2369	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ANJASMARA CANDRA DEWA"}	1
2402	0126-2001-2370	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "BIFA WISNU PRADIPTA ADYA"}	1
2403	0126-2001-2371	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUFLIH RAMADHANI"}	1
2404	0126-2001-2372	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DEVI BERHITU"}	1
2405	0126-2001-2373	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DICKY EFFENDY"}	1
2406	0126-2001-2374	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "DIGA ARNOLDUS SAHABAT S S.H. M.H. M.KN"}	1
2407	0126-2001-2375	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FAHRUL FAUZI"}	1
2408	0126-2001-2376	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "GUSTI BAGUS GILANG PRAWIRA"}	1
2409	0126-2001-2377	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "HANINDITO ARFEBI SETYONO"}	1
2410	0126-2001-2378	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M. HENDRI KURNIAWAN"}	1
2411	0126-2001-2379	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ICHSAN SYAIDIQI"}	1
2412	0126-2001-2380	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "KIAGOOS ADHIMAS MUHAMAD ADHIPERWIRA"}	1
2413	0126-2001-2381	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MHD. RIZKI ROSADI"}	1
2414	0126-2001-2382	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "M. IQBAL MAULANA HAEDAR"}	1
2415	0126-2001-2383	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FAKHRUDDIN"}	1
2416	0126-2001-2384	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SUTAN PASHA UMBARA"}	1
2417	0126-2001-2385	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "MUHAMMAD REYHAN MAHAFIZH"}	1
2418	0126-2001-2386	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "ARGA SATRIATAMA KURNIA SAKTI"}	1
2419	0126-2001-2387	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RONNY AULIA RIZKI"}	1
2420	0126-2001-2388	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "FRANANDA SARAGIH"}	1
2421	0126-2001-2389	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SEPTHIAN WIBYSONO"}	1
2422	0126-2001-2390	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SOEGIH RASYAD SRIWIDYANDIYO"}	1
2423	0126-2001-2391	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "SYAHRO MILENIO"}	1
2424	0126-2001-2392	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "WAHYU PRATAMA AJI"}	1
2425	0126-2001-2393	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "WISNU CAKRA WARDHANA"}	1
2426	0126-2001-2394	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "YANUAR RIANSYAH EFFENDI"}	1
2427	0126-2001-2395	1	\N	\N	\N	1	0	2026-01-19 07:51:54.821+00	2026-01-12 07:51:54.821264+00	\N	t	{"candidate_name": "RACHMADI ADJI PRAKOSO"}	1
2429	0126-0000-0002	1	\N	74	\N	1	1	2026-01-19 08:45:52.392+00	2026-01-12 08:45:52.391212+00	2026-01-12 08:53:11.441728+00	t	{}	2
2431	0126-0000-0004	1	\N	85	\N	1	1	2026-01-19 09:49:36.856+00	2026-01-12 09:49:36.855022+00	2026-01-12 09:49:37.255489+00	t	{}	2
2432	0126-0000-0005	1	\N	86	\N	1	1	2026-01-19 09:50:20.249+00	2026-01-12 09:50:20.24862+00	2026-01-12 09:50:20.411966+00	t	{}	2
2433	0126-0000-0006	1	\N	87	\N	1	1	2026-01-19 09:51:21.463+00	2026-01-12 09:51:21.462327+00	2026-01-12 09:51:21.554131+00	t	{}	2
2434	0126-0000-0007	1	\N	88	\N	1	1	2026-01-19 09:56:08.531+00	2026-01-12 09:56:08.530542+00	2026-01-12 09:56:08.628814+00	t	{}	2
2435	0126-0000-0008	1	\N	91	\N	1	1	2026-01-19 10:04:18.229+00	2026-01-12 10:04:18.224517+00	2026-01-12 10:04:18.655802+00	t	{}	2
2436	0126-0000-0009	1	\N	92	\N	1	1	2026-01-19 10:06:19.02+00	2026-01-12 10:06:19.020159+00	2026-01-12 10:06:19.104391+00	t	{}	2
2430	0126-0000-0003	1	\N	99	\N	1	1	2026-01-19 09:46:29.379+00	2026-01-12 09:46:29.378199+00	2026-01-12 11:21:11.768042+00	t	{}	2
\.


--
-- Data for Name: candidate_groups; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.candidate_groups (id, exam_id, candidate_id, assessor_id, assigned_by, created_at) FROM stdin;
107	5	7	16	1	2026-01-10 11:14:28.684807
108	5	31	16	1	2026-01-10 11:14:28.684807
109	5	27	13	1	2026-01-10 11:14:28.684807
110	5	22	12	1	2026-01-10 11:14:28.684807
111	5	28	12	1	2026-01-10 11:14:28.684807
112	5	29	12	1	2026-01-10 11:14:28.684807
113	5	30	13	1	2026-01-10 11:14:28.684807
114	5	3	12	1	2026-01-10 11:14:28.684807
115	5	17	13	1	2026-01-10 11:14:28.684807
116	5	26	16	1	2026-01-10 11:14:28.684807
117	5	21	16	1	2026-01-10 11:14:28.684807
118	5	25	12	1	2026-01-10 11:14:28.684807
119	5	34	12	1	2026-01-10 11:14:28.684807
120	5	24	13	1	2026-01-10 11:14:28.684807
121	5	32	16	1	2026-01-10 11:14:28.684807
122	5	20	16	1	2026-01-10 11:14:28.684807
123	5	19	13	1	2026-01-10 11:14:28.684807
\.


--
-- Data for Name: code_sequences; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.code_sequences (prefix, next_num, created_at, updated_at) FROM stdin;
0126-2001-	2396	2026-01-11 21:17:17.529273+00	2026-01-12 07:51:54.821264+00
0126-0000-	10	2026-01-12 08:02:12.142049+00	2026-01-12 10:06:19.020159+00
\.


--
-- Data for Name: company_codes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.company_codes (id, code, company_name, organization_id, is_active, created_at, updated_at) FROM stdin;
1	2001	Kimia Farma Diagnostika	\N	t	2026-01-11 17:52:34.297788	2026-01-11 20:21:57.042002
2	0000	Default	\N	t	2026-01-11 20:35:44.0136	2026-01-11 20:35:44.0136
\.


--
-- Data for Name: exam_answers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.exam_answers (id, attempt_id, question_id, selected_option_id, answered_at) FROM stdin;
1	28	381	773	2026-01-09 03:24:20.020215+00
2	28	382	775	2026-01-09 03:24:20.076148+00
3	28	383	777	2026-01-09 03:24:20.077197+00
4	28	384	779	2026-01-09 03:24:20.078128+00
5	28	385	781	2026-01-09 03:24:20.079339+00
6	29	381	774	2026-01-09 04:02:27.221356+00
7	29	382	776	2026-01-09 04:02:27.221939+00
8	29	383	778	2026-01-09 04:02:27.222273+00
9	29	384	780	2026-01-09 04:02:27.22259+00
22	29	385	782	2026-01-09 04:02:27.22286+00
28	29	386	784	2026-01-09 04:02:27.223134+00
47	30	381	773	2026-01-09 11:34:11.833697+00
48	30	382	776	2026-01-09 11:34:11.834601+00
51	30	383	778	2026-01-09 11:34:11.835218+00
64	31	567	1151	2026-01-09 13:18:26.912156+00
65	32	568	1154	2026-01-09 13:18:56.235994+00
66	32	569	1157	2026-01-09 13:18:56.2369+00
67	32	570	1159	2026-01-09 13:18:56.237486+00
77	33	568	1154	2026-01-09 14:24:35.107877+00
78	33	569	1157	2026-01-09 14:24:35.108723+00
79	33	570	1159	2026-01-09 14:24:35.109232+00
83	33	571	1160	2026-01-09 14:24:35.109832+00
100	34	568	1154	2026-01-10 11:02:10.033176+00
102	34	569	1157	2026-01-10 11:02:10.034857+00
105	34	570	1158	2026-01-10 11:02:10.035513+00
109	34	571	1160	2026-01-10 11:02:10.03669+00
114	34	572	1163	2026-01-10 11:02:10.037447+00
690	46	1599	5130	2026-01-12 10:04:20.817656+00
691	46	1600	5136	2026-01-12 10:04:20.817656+00
692	46	1601	5142	2026-01-12 10:04:20.817656+00
693	46	1602	5148	2026-01-12 10:04:20.817656+00
694	46	1603	5154	2026-01-12 10:04:20.817656+00
695	46	1604	5155	2026-01-12 10:04:20.817656+00
696	46	1605	5161	2026-01-12 10:04:20.817656+00
697	46	1606	5167	2026-01-12 10:04:20.817656+00
698	46	1607	5173	2026-01-12 10:04:20.817656+00
699	46	1608	5179	2026-01-12 10:04:20.817656+00
710	47	1609	5180	2026-01-12 10:04:21.358512+00
711	47	1610	5183	2026-01-12 10:04:21.358512+00
712	47	1611	5184	2026-01-12 10:04:21.358512+00
713	47	1612	5187	2026-01-12 10:04:21.358512+00
714	47	1613	5188	2026-01-12 10:04:21.358512+00
715	47	1614	5191	2026-01-12 10:04:21.358512+00
716	47	1615	5192	2026-01-12 10:04:21.358512+00
717	47	1616	5195	2026-01-12 10:04:21.358512+00
718	47	1617	5196	2026-01-12 10:04:21.358512+00
719	47	1618	5199	2026-01-12 10:04:21.358512+00
720	47	1619	5200	2026-01-12 10:04:21.358512+00
721	47	1620	5203	2026-01-12 10:04:21.358512+00
722	47	1621	5204	2026-01-12 10:04:21.358512+00
723	47	1622	5207	2026-01-12 10:04:21.358512+00
724	47	1623	5208	2026-01-12 10:04:21.358512+00
725	47	1624	5211	2026-01-12 10:04:21.358512+00
726	47	1625	5212	2026-01-12 10:04:21.358512+00
727	47	1626	5215	2026-01-12 10:04:21.358512+00
728	47	1627	5216	2026-01-12 10:04:21.358512+00
729	47	1628	5219	2026-01-12 10:04:21.358512+00
730	47	1629	5220	2026-01-12 10:04:21.358512+00
731	47	1630	5223	2026-01-12 10:04:21.358512+00
732	47	1631	5224	2026-01-12 10:04:21.358512+00
733	47	1632	5227	2026-01-12 10:04:21.358512+00
734	47	1633	5228	2026-01-12 10:04:21.358512+00
735	47	1634	5231	2026-01-12 10:04:21.358512+00
736	47	1635	5232	2026-01-12 10:04:21.358512+00
737	47	1636	5235	2026-01-12 10:04:21.358512+00
738	47	1637	5236	2026-01-12 10:04:21.358512+00
768	48	752	1524	2026-01-12 10:04:21.614188+00
769	48	753	1527	2026-01-12 10:04:21.614188+00
770	48	754	1528	2026-01-12 10:04:21.614188+00
771	48	755	1531	2026-01-12 10:04:21.614188+00
772	48	756	1532	2026-01-12 10:04:21.614188+00
773	48	757	1535	2026-01-12 10:04:21.614188+00
774	48	758	1536	2026-01-12 10:04:21.614188+00
775	48	759	1539	2026-01-12 10:04:21.614188+00
776	48	760	1540	2026-01-12 10:04:21.614188+00
777	48	761	1543	2026-01-12 10:04:21.614188+00
1324	55	1609	5397	2026-01-12 17:56:16.884785+00
1325	55	1610	5399	2026-01-12 17:56:16.884785+00
1326	55	1611	5401	2026-01-12 17:56:16.884785+00
898	52	1614	5407	2026-01-12 11:22:35.657355+00
899	52	1615	5409	2026-01-12 11:22:35.657355+00
907	52	1616	5411	2026-01-12 11:22:35.657355+00
908	52	1617	5413	2026-01-12 11:22:35.657355+00
918	52	1618	5415	2026-01-12 11:22:35.657355+00
919	52	1619	5417	2026-01-12 11:22:35.657355+00
931	52	1620	5418	2026-01-12 11:22:35.657355+00
932	52	1621	5420	2026-01-12 11:22:35.657355+00
946	52	1622	5423	2026-01-12 11:22:35.657355+00
961	52	1623	5425	2026-01-12 11:22:35.657355+00
977	52	1624	5427	2026-01-12 11:22:35.657355+00
1026	52	1625	5428	2026-01-12 11:22:35.657355+00
1044	52	1626	5430	2026-01-12 11:22:35.657355+00
1063	52	1627	5432	2026-01-12 11:22:35.657355+00
1083	52	1628	5434	2026-01-12 11:22:35.657355+00
1104	52	1629	5436	2026-01-12 11:22:35.657355+00
1126	52	1630	5438	2026-01-12 11:22:35.657355+00
1149	52	1631	5440	2026-01-12 11:22:35.657355+00
1173	52	1632	5442	2026-01-12 11:22:35.657355+00
1198	52	1633	5444	2026-01-12 11:22:35.657355+00
1199	52	1634	5446	2026-01-12 11:22:35.657355+00
1330	55	1612	5402	2026-01-12 17:56:16.884785+00
1518	55	1629	5437	2026-01-12 17:56:16.884785+00
1226	52	1635	5448	2026-01-12 11:22:35.657355+00
1540	55	1630	5439	2026-01-12 17:56:16.884785+00
1563	55	1631	5441	2026-01-12 17:56:16.884785+00
1258	54	1599	5346	2026-01-12 17:50:24.021116+00
1261	54	1600	5351	2026-01-12 17:50:24.021116+00
1264	54	1601	5356	2026-01-12 17:50:24.021116+00
1268	54	1602	5365	2026-01-12 17:50:24.021116+00
886	52	1609	5396	2026-01-12 11:22:35.657355+00
887	52	1610	5398	2026-01-12 11:22:35.657355+00
890	52	1611	5400	2026-01-12 11:22:35.657355+00
1227	52	1636	5451	2026-01-12 11:22:35.657355+00
1273	54	1603	5370	2026-01-12 17:50:24.021116+00
891	52	1612	5402	2026-01-12 11:22:35.657355+00
1228	52	1637	5452	2026-01-12 11:22:35.657355+00
1279	54	1604	5371	2026-01-12 17:50:24.021116+00
892	52	1613	5404	2026-01-12 11:22:35.657355+00
1587	55	1632	5443	2026-01-12 17:56:16.884785+00
1286	54	1605	5380	2026-01-12 17:50:24.021116+00
1294	54	1606	5384	2026-01-12 17:50:24.021116+00
1303	54	1607	5390	2026-01-12 17:50:24.021116+00
1313	54	1608	5395	2026-01-12 17:50:24.021116+00
1612	55	1633	5445	2026-01-12 17:56:16.884785+00
1693	55	1634	5447	2026-01-12 17:56:16.884785+00
1665	55	1635	5448	2026-01-12 17:56:16.884785+00
1638	55	1636	5451	2026-01-12 17:56:16.884785+00
1639	55	1637	5453	2026-01-12 17:56:16.884785+00
788	49	1599	5238	2026-01-12 10:06:19.427916+00
789	49	1600	5244	2026-01-12 10:06:19.427916+00
790	49	1601	5250	2026-01-12 10:06:19.427916+00
791	49	1602	5256	2026-01-12 10:06:19.427916+00
792	49	1603	5262	2026-01-12 10:06:19.427916+00
793	49	1604	5263	2026-01-12 10:06:19.427916+00
572	42	752	1524	2026-01-12 09:51:24.193145+00
573	42	753	1527	2026-01-12 09:51:24.193145+00
574	42	754	1528	2026-01-12 09:51:24.193145+00
575	42	755	1531	2026-01-12 09:51:24.193145+00
576	42	756	1532	2026-01-12 09:51:24.193145+00
577	42	757	1535	2026-01-12 09:51:24.193145+00
578	42	758	1536	2026-01-12 09:51:24.193145+00
579	42	759	1539	2026-01-12 09:51:24.193145+00
580	42	760	1540	2026-01-12 09:51:24.193145+00
581	42	761	1543	2026-01-12 09:51:24.193145+00
794	49	1605	5269	2026-01-12 10:06:19.427916+00
795	49	1606	5275	2026-01-12 10:06:19.427916+00
796	49	1607	5281	2026-01-12 10:06:19.427916+00
797	49	1608	5287	2026-01-12 10:06:19.427916+00
808	50	1609	5288	2026-01-12 10:06:19.704838+00
809	50	1610	5291	2026-01-12 10:06:19.704838+00
810	50	1611	5292	2026-01-12 10:06:19.704838+00
811	50	1612	5295	2026-01-12 10:06:19.704838+00
812	50	1613	5296	2026-01-12 10:06:19.704838+00
813	50	1614	5299	2026-01-12 10:06:19.704838+00
814	50	1615	5300	2026-01-12 10:06:19.704838+00
815	50	1616	5303	2026-01-12 10:06:19.704838+00
816	50	1617	5304	2026-01-12 10:06:19.704838+00
817	50	1618	5307	2026-01-12 10:06:19.704838+00
818	50	1619	5308	2026-01-12 10:06:19.704838+00
819	50	1620	5311	2026-01-12 10:06:19.704838+00
820	50	1621	5312	2026-01-12 10:06:19.704838+00
821	50	1622	5315	2026-01-12 10:06:19.704838+00
822	50	1623	5316	2026-01-12 10:06:19.704838+00
823	50	1624	5319	2026-01-12 10:06:19.704838+00
824	50	1625	5320	2026-01-12 10:06:19.704838+00
825	50	1626	5323	2026-01-12 10:06:19.704838+00
826	50	1627	5324	2026-01-12 10:06:19.704838+00
827	50	1628	5327	2026-01-12 10:06:19.704838+00
828	50	1629	5328	2026-01-12 10:06:19.704838+00
829	50	1630	5331	2026-01-12 10:06:19.704838+00
830	50	1631	5332	2026-01-12 10:06:19.704838+00
831	50	1632	5335	2026-01-12 10:06:19.704838+00
832	50	1633	5336	2026-01-12 10:06:19.704838+00
833	50	1634	5339	2026-01-12 10:06:19.704838+00
834	50	1635	5340	2026-01-12 10:06:19.704838+00
835	50	1636	5343	2026-01-12 10:06:19.704838+00
836	50	1637	5344	2026-01-12 10:06:19.704838+00
866	51	752	1524	2026-01-12 10:06:19.957964+00
867	51	753	1527	2026-01-12 10:06:19.957964+00
868	51	754	1528	2026-01-12 10:06:19.957964+00
869	51	755	1531	2026-01-12 10:06:19.957964+00
870	51	756	1532	2026-01-12 10:06:19.957964+00
871	51	757	1535	2026-01-12 10:06:19.957964+00
670	45	752	1524	2026-01-12 09:56:09.5921+00
671	45	753	1527	2026-01-12 09:56:09.5921+00
672	45	754	1528	2026-01-12 09:56:09.5921+00
673	45	755	1531	2026-01-12 09:56:09.5921+00
674	45	756	1532	2026-01-12 09:56:09.5921+00
675	45	757	1535	2026-01-12 09:56:09.5921+00
676	45	758	1536	2026-01-12 09:56:09.5921+00
677	45	759	1539	2026-01-12 09:56:09.5921+00
678	45	760	1540	2026-01-12 09:56:09.5921+00
679	45	761	1543	2026-01-12 09:56:09.5921+00
872	51	758	1536	2026-01-12 10:06:19.957964+00
873	51	759	1539	2026-01-12 10:06:19.957964+00
874	51	760	1540	2026-01-12 10:06:19.957964+00
875	51	761	1543	2026-01-12 10:06:19.957964+00
1335	55	1613	5405	2026-01-12 17:56:16.884785+00
1336	55	1614	5407	2026-01-12 17:56:16.884785+00
1343	55	1615	5409	2026-01-12 17:56:16.884785+00
1351	55	1616	5411	2026-01-12 17:56:16.884785+00
1352	55	1617	5413	2026-01-12 17:56:16.884785+00
1353	55	1618	5415	2026-01-12 17:56:16.884785+00
1364	55	1619	5417	2026-01-12 17:56:16.884785+00
1365	55	1620	5419	2026-01-12 17:56:16.884785+00
1378	55	1621	5421	2026-01-12 17:56:16.884785+00
1392	55	1622	5423	2026-01-12 17:56:16.884785+00
1407	55	1623	5425	2026-01-12 17:56:16.884785+00
1423	55	1624	5427	2026-01-12 17:56:16.884785+00
1440	55	1625	5429	2026-01-12 17:56:16.884785+00
1458	55	1626	5431	2026-01-12 17:56:16.884785+00
1477	55	1627	5433	2026-01-12 17:56:16.884785+00
1497	55	1628	5435	2026-01-12 17:56:16.884785+00
\.


--
-- Data for Name: exam_assessors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.exam_assessors (id, exam_id, admin_id, assigned_by, deleted_at, created_at, candidate_ids) FROM stdin;
1	2	1	\N	\N	2025-12-31 01:40:04.760439	{7,8,6}
2	2	2	\N	\N	2025-12-31 01:40:04.760439	{3,5}
5	5	12	\N	\N	2026-01-08 05:08:09.823065	{20}
3	5	13	\N	\N	2026-01-08 04:58:31.297506	{7,17}
4	5	16	\N	\N	2026-01-08 04:58:31.297506	{3,19}
\.


--
-- Data for Name: exam_attempts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.exam_attempts (id, user_id, exam_id, start_time, end_time, score, status, created_at, pss_result, pss_category, srq_result, srq_conclusion) FROM stdin;
1	2	2	2025-12-24 20:24:59.009689	2025-12-24 20:30:38.374814	0	completed	2025-12-24 20:24:59.009689	\N	\N	\N	\N
2	2	1	2025-12-24 20:28:16.381889	2025-12-28 13:05:14.466005	0	completed	2025-12-24 20:28:16.381889	\N	\N	\N	\N
5	3	2	2025-12-28 13:55:20.429383	2025-12-28 14:01:59.284726	0	completed	2025-12-28 13:55:20.429383	\N	\N	\N	\N
6	1	2	2025-12-31 01:12:27.264633	2025-12-31 01:12:39.364563	100	completed	2025-12-31 01:12:27.264633	\N	\N	\N	\N
7	8	2	2025-12-31 01:29:35.234655	2025-12-31 01:29:39.875682	100	completed	2025-12-31 01:29:35.234655	\N	\N	\N	\N
9	17	5	2026-01-07 02:09:35.455614	2026-01-07 02:32:12.800005	1	completed	2026-01-07 02:09:35.455614	\N	\N	\N	\N
10	17	2	2026-01-07 03:07:52.086479	2026-01-07 03:08:06.523021	100	completed	2026-01-07 03:07:52.086479	\N	\N	\N	\N
11	3	5	2026-01-07 18:10:16.551614	2026-01-07 19:10:16.551614	\N	completed	2026-01-07 19:10:16.551614	\N	\N	\N	\N
12	3	5	2026-01-07 18:17:24.944636	2026-01-07 19:17:24.944636	\N	completed	2026-01-07 19:17:24.944636	\N	\N	\N	\N
13	3	5	2026-01-07 18:19:30.643045	2026-01-07 19:19:30.643045	\N	completed	2026-01-07 19:19:30.643045	\N	\N	\N	\N
14	3	5	2026-01-07 18:20:03.693983	2026-01-07 19:20:03.693983	\N	completed	2026-01-07 19:20:03.693983	\N	\N	\N	\N
15	3	5	2026-01-07 17:33:12.636854	2026-01-07 18:33:12.636854	\N	completed	2026-01-07 19:33:12.636854	\N	\N	\N	\N
16	3	5	2026-01-07 17:34:46.745549	2026-01-07 18:34:46.745549	\N	completed	2026-01-07 19:34:46.745549	\N	\N	\N	\N
17	3	5	2026-01-07 17:42:05.821298	2026-01-07 18:42:05.821298	\N	completed	2026-01-07 19:42:05.821298	\N	\N	\N	\N
18	3	5	2026-01-07 17:44:02.551	2026-01-07 18:44:02.551	\N	completed	2026-01-07 19:44:02.551	\N	\N	\N	\N
19	3	5	2026-01-07 17:45:59.955316	2026-01-07 18:45:59.955316	\N	completed	2026-01-07 19:45:59.955316	\N	\N	\N	\N
20	19	5	2026-01-08 04:13:51.484818	2026-01-08 04:14:49.599239	1	completed	2026-01-08 04:13:51.484818	\N	\N	\N	\N
8	7	5	2026-01-02 13:37:07.528854	2026-01-02 13:57:07.528854	0	completed	2026-01-02 13:37:07.528854	\N	\N	\N	\N
21	20	5	2026-01-08 04:17:04.316014	2026-01-08 04:37:04.316014	0	completed	2026-01-08 04:17:04.316014	\N	\N	\N	\N
22	21	5	2026-01-08 18:06:04.6964	2026-01-08 18:26:04.6964	0	completed	2026-01-08 18:06:04.6964	\N	\N	\N	\N
23	22	5	2026-01-08 19:38:43.399499	2026-01-08 19:39:44.558592	0	completed	2026-01-08 19:38:43.399499	\N	\N	\N	\N
24	25	5	2026-01-09 01:01:59.096897	2026-01-09 01:03:22.840035	1	completed	2026-01-09 01:01:59.096897	\N	\N	\N	\N
25	26	5	2026-01-09 01:45:07.532785	\N	\N	in_progress	2026-01-09 01:45:07.532785	\N	\N	\N	\N
26	27	5	2026-01-09 02:26:30.574701	2026-01-09 02:28:43.647472	1	completed	2026-01-09 02:26:30.574701	\N	\N	\N	\N
27	28	5	2026-01-09 02:47:20.005847	\N	\N	in_progress	2026-01-09 02:47:20.005847	\N	\N	\N	\N
28	29	5	2026-01-09 03:23:22.714076	2026-01-09 03:24:20.195094	3	completed	2026-01-09 03:23:22.714076	\N	\N	\N	\N
29	30	5	2026-01-09 04:02:10.54681	2026-01-09 04:02:36.003433	0	completed	2026-01-09 04:02:10.54681	\N	\N	\N	\N
30	31	5	2026-01-09 11:33:56.038059	2026-01-09 11:34:30.652005	1	completed	2026-01-09 11:33:56.038059	\N	\N	\N	\N
31	32	8	2026-01-09 13:18:24.327016	2026-01-09 13:18:31.28069	0	completed	2026-01-09 13:18:24.327016	\N	\N	\N	\N
32	32	5	2026-01-09 13:18:36.581702	2026-01-09 13:19:02.005381	1	completed	2026-01-09 13:18:36.581702	\N	\N	\N	\N
33	33	5	2026-01-09 14:23:38.577463	2026-01-09 14:24:49.641261	1	completed	2026-01-09 14:23:38.577463	\N	\N	\N	\N
34	34	5	2026-01-10 11:00:31.888295	2026-01-10 11:03:29.878626	2	completed	2026-01-10 11:00:31.888295	\N	\N	\N	\N
42	87	5	2026-01-12 09:51:24.100827	2026-01-12 09:51:24.278987	3	completed	2026-01-12 09:51:24.100827	\N	\N	\N	\N
45	88	5	2026-01-12 09:56:09.500754	2026-01-12 09:56:09.672099	3	completed	2026-01-12 09:56:09.500754	\N	\N	\N	\N
46	91	9	2026-01-12 10:04:20.420824	2026-01-12 10:04:21.175582	16	completed	2026-01-12 10:04:20.420824	{"rawScore":20,"totalScore":16,"level":"sedang","levelLabel":"Stress Sedang","description":"Tingkat stress yang dialami tergolong sedang. Disarankan untuk melakukan teknik relaksasi dan manajemen stress."}	Stress Sedang	\N	\N
48	91	5	2026-01-12 10:04:21.529258	2026-01-12 10:04:21.683022	3	completed	2026-01-12 10:04:21.529258	\N	\N	\N	\N
49	92	9	2026-01-12 10:06:19.348773	2026-01-12 10:06:19.521183	16	completed	2026-01-12 10:06:19.348773	{"rawScore":20,"totalScore":16,"level":"sedang","levelLabel":"Stress Sedang","description":"Tingkat stress yang dialami tergolong sedang. Disarankan untuk melakukan teknik relaksasi dan manajemen stress."}	Stress Sedang	\N	\N
51	92	5	2026-01-12 10:06:19.876074	2026-01-12 10:06:20.033196	3	completed	2026-01-12 10:06:19.876074	\N	\N	\N	\N
47	91	10	2026-01-12 10:04:21.274838	2026-01-12 10:04:21.43532	15	completed	2026-01-12 10:04:21.274838	\N	\N	{"answers":{"1609":"Y","1610":"N","1611":"Y","1612":"N","1613":"Y","1614":"N","1615":"Y","1616":"N","1617":"Y","1618":"N","1619":"Y","1620":"N","1621":"Y","1622":"N","1623":"Y","1624":"N","1625":"Y","1626":"N","1627":"Y","1628":"N","1629":"Y","1630":"N","1631":"Y","1632":"N","1633":"Y","1634":"N","1635":"Y","1636":"N","1637":"Y"},"result":{"anxiety":true,"substance":true,"psychotic":true,"ptsd":true,"conclusion":"Tidak Normal - ","resultText":"Tidak Normal. Terdapat penggunaan zat psikoaktif/narkoba, gejala psikologis seperti cemas, depresi, gejala episode psikotik, dan PTSD/gejala stress setelah trauma"},"type":"srq29"}	Tidak Normal - Cemas/Depresi + Zat + Psikotik + PTSD
50	92	10	2026-01-12 10:06:19.619248	2026-01-12 10:06:19.784166	15	completed	2026-01-12 10:06:19.619248	\N	\N	{"answers":{"1609":"Y","1610":"N","1611":"Y","1612":"N","1613":"Y","1614":"N","1615":"Y","1616":"N","1617":"Y","1618":"N","1619":"Y","1620":"N","1621":"Y","1622":"N","1623":"Y","1624":"N","1625":"Y","1626":"N","1627":"Y","1628":"N","1629":"Y","1630":"N","1631":"Y","1632":"N","1633":"Y","1634":"N","1635":"Y","1636":"N","1637":"Y"},"result":{"anxiety":true,"substance":true,"psychotic":true,"ptsd":true,"conclusion":"Tidak Normal - ","resultText":"Tidak Normal. Terdapat penggunaan zat psikoaktif/narkoba, gejala psikologis seperti cemas, depresi, gejala episode psikotik, dan PTSD/gejala stress setelah trauma"},"type":"srq29"}	Tidak Normal - Cemas/Depresi + Zat + Psikotik + PTSD
52	99	10	2026-01-12 11:21:39.128821	2026-01-12 11:22:37.02032	19	completed	2026-01-12 11:21:39.128821	\N	\N	{"neurosis":11,"psychosis":3,"ptsd":4,"substanceUse":1,"totalScore":19,"categories":[{"category":"cemasDepresi","score":11,"threshold":5,"positive":true},{"category":"penggunaanZat","score":1,"threshold":1,"positive":true},{"category":"psikotik","score":3,"threshold":1,"positive":true},{"category":"ptsd","score":4,"threshold":1,"positive":true}],"outputText":"Tidak Normal. Terdapat penggunaan zat psikoaktif/narkoba, gejala psikologis seperti cemas, depresi, gejala episode psikotik, dan PTSD/gejala stress setelah trauma"}	Tidak Normal - Cemas/Depresi + Zat + Psikotik + PTSD
53	74	5	2026-01-12 11:25:33.277404	2026-01-12 17:47:05.094861	\N	completed	2026-01-12 11:25:33.277404	\N	\N	\N	\N
54	74	9	2026-01-12 17:48:21.556214	2026-01-12 17:50:40.491163	9	completed	2026-01-12 17:48:21.556214	{"rawScore":23,"totalScore":9,"level":"ringan","levelLabel":"Stress Ringan","description":"Tingkat stress yang dialami tergolong ringan. Individu mampu mengelola tekanan dengan baik."}	Stress Ringan	\N	\N
55	74	10	2026-01-12 17:52:39.530512	2026-01-12 17:56:22.355132	2	completed	2026-01-12 17:52:39.530512	\N	\N	{"answers":{"1609":"N","1610":"N","1611":"N","1612":"Y","1613":"N","1614":"N","1615":"N","1616":"N","1617":"N","1618":"N","1619":"N","1620":"N","1621":"N","1622":"N","1623":"N","1624":"N","1625":"N","1626":"N","1627":"N","1628":"N","1629":"N","1630":"N","1631":"N","1632":"N","1633":"N","1634":"N","1635":"Y","1636":"N","1637":"N"},"result":{"anxiety":false,"substance":false,"psychotic":false,"ptsd":true,"conclusion":"Tidak Normal - PTSD","resultText":"Tidak Normal. Terdapat gejala PTSD/gejala stress setelah trauma. Namun, tidak terdapat gejala psikologis seperti cemas dan depresi, penggunaan zat psikoaktif/narkoba, dan gejala episode psikotik."},"type":"srq29"}	Tidak Normal - PTSD
\.


--
-- Data for Name: exams; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.exams (id, title, description, duration_minutes, status, created_at, is_special, instructions, display_mode, thumbnail, require_all_answers, exam_type, is_standard) FROM stdin;
6	Test CRUD Psikolog	Test dari curl	30	draft	2026-01-06 21:31:38.766027	f	\N	per_page	\N	f	general	f
2	Test Matematika	Ujian matematika dasar	30	draft	2025-12-24 20:16:54.061749	f	\N	per_page	\N	f	general	f
1	Tes Potensi Akademik	Tes logika, verbal, dan numerik.	90	draft	2025-12-24 19:44:11.307399	f	\N	per_page	\N	f	general	f
8	Tester sebelum hari H		60	draft	2026-01-09 13:16:37.738301	f	\N	scroll	\N	f	general	f
9	Perceived Stress Scale (PSS)	Kuesioner untuk mengukur tingkat stres yang dirasakan selama satu bulan terakhir. Terdiri dari 10 pertanyaan dengan skala 0-4.	30	published	2026-01-12 06:55:31.836514	f	PETUNJUK PENGISIAN\n\n1. Bacalah pertanyaan dan pernyataan berikut dengan baik\n2. Anda diperbolehkan bertanya kepada peneliti jika ada pertanyaan yang tidak dimengerti\n3. Berikan tanda centang (✓) pada salah satu pilihan jawaban yang paling sesuai dengan perasaan dan pikiran anda selama SATU BULAN TERAKHIR\n4. Untuk pertanyaan nomor 4, 5, 7, dan 8 merupakan pertanyaan positif yang skornya akan dihitung terbalik secara otomatis\n\nKETERANGAN SKOR:\n• 0 = Tidak pernah\n• 1 = Hampir tidak pernah (1-2 kali)\n• 2 = Kadang-kadang (3-4 kali)\n• 3 = Hampir sering (5-6 kali)\n• 4 = Sangat sering (lebih dari 6 kali)\n\nKATEGORI HASIL:\n• Skor 1-13 = Stres Ringan\n• Skor 14-26 = Stres Sedang\n• Skor 27-40 = Stres Berat\n\nSelamat mengisi dan terima kasih atas kerjasamanya.	scroll	\N	t	pss	t
5	TES 1	Minnesota Multiphasic Personality Inventory - Tes Kepribadian 183 Pernyataan	60	published	2026-01-01 23:46:37.668241	t	PETUNJUK\n\n1. Bacalah dengan teliti setiap pernyataan dari 183 pernyataan berikut ini dan berusahalah memahami pernyataan tersebut dengan sebaik-baiknya!\n\n2. Jawablah pernyataan-pernyataan itu pada lembar kerja yang tersedia.\n\n3. Apabila Saudara setuju bahwa pernyataan itu sesuai dengan keadaan diri saudara yang sebenarnya, maka pilih YA pada pilihan jawaban yang sudah disediakan.\n\n4. Apabila Saudara merasa pernyataan itu tidak sesuai dengan keadaan diri saudara yang sebenarnya, maka pilih TIDAK pada pilihan jawaban yang sudah disediakan.\n\n5. Jawablah pernyataan tersebut apa adanya sesuai dengan keadaan saudara. (Bila saudara tidak menjawab apa adanya dan tidak menjawab sungguh-sungguh, maka akan terungkap juga didalam analisa tes ini).\n\nSelamat Mengerjakan.	scroll	https://detection.id/mmpi-2-untuk-seleksi-masuk-kedokteran-benara-tau-tidak/	t	general	f
10	Self-Reporting Questionnaire (SRQ-29)	Kuesioner untuk mendeteksi gangguan kesehatan mental termasuk kecemasan, depresi, penggunaan zat, gangguan psikotik, dan PTSD. Terdiri dari 29 pertanyaan Ya/Tidak.	30	published	2026-01-12 06:55:31.887921	f	PETUNJUK PENGISIAN\n\nSelf-Reporting Questionnaire (SRQ-29) adalah alat skrining untuk mendeteksi gangguan kesehatan mental.\n\n1. Bacalah setiap pertanyaan dengan seksama\n2. Jawab setiap pertanyaan dengan jujur sesuai dengan kondisi yang Anda alami\n3. Pilih "Ya" jika Anda mengalami gejala tersebut, atau "Tidak" jika tidak mengalaminya\n4. Tidak ada jawaban benar atau salah\n\nINTERPRETASI:\n• Pertanyaan 1-20: Mendeteksi gejala kecemasan dan depresi\n• Pertanyaan 21: Penggunaan zat psikoaktif/narkoba\n• Pertanyaan 22-24: Gejala gangguan psikotik\n• Pertanyaan 25-29: Gejala PTSD (Post-Traumatic Stress Disorder)\n\nHasil akan dihitung secara otomatis berdasarkan jawaban Anda.\n\nSelamat mengisi.	scroll	\N	t	srq29	t
\.


--
-- Data for Name: mmpi_results; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mmpi_results (id, attempt_id, pdf_data, raw_scores, t_scores, generated_at, created_at) FROM stdin;
\.


--
-- Data for Name: options; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.options (id, question_id, text, is_correct) FROM stdin;
1520	751	a	t
1521	751	a	f
1522	751	a	f
1523	751	a	f
1139	564	3	f
1140	564	4	t
1141	564	5	f
1142	565	Jakarta	t
1143	565	Bandung	f
1144	565	Surabaya	f
1145	565	Medan	f
1146	566	3	f
1147	566	4	t
1148	566	5	f
1149	566	22	f
403	196	A	t
404	196	B	f
5385	1606	Sangat Sering (4)	f
5386	1607	Tidak Pernah (0)	t
5387	1607	Hampir Tidak Pernah (1)	f
5388	1607	Kadang-kadang (2)	f
5389	1607	Cukup Sering (3)	f
5390	1607	Sangat Sering (4)	f
5391	1608	Tidak Pernah (0)	t
5392	1608	Hampir Tidak Pernah (1)	f
5393	1608	Kadang-kadang (2)	f
5394	1608	Cukup Sering (3)	f
5395	1608	Sangat Sering (4)	f
1769	874	TIDAK	f
1770	875	YA	t
1771	875	TIDAK	f
1772	876	YA	t
1773	876	TIDAK	f
1774	877	YA	t
1775	877	TIDAK	f
1776	878	YA	t
1777	878	TIDAK	f
1778	879	YA	t
1779	879	TIDAK	f
1780	880	YA	t
1781	880	TIDAK	f
1782	881	YA	t
1783	881	TIDAK	f
1784	882	YA	t
1785	882	TIDAK	f
1786	883	YA	t
1787	883	TIDAK	f
1788	884	YA	t
1789	884	TIDAK	f
1790	885	YA	t
1791	885	TIDAK	f
1792	886	YA	t
1793	886	TIDAK	f
1794	887	YA	t
1795	887	TIDAK	f
1796	888	YA	t
1797	888	TIDAK	f
1798	889	YA	t
1799	889	TIDAK	f
1800	890	YA	t
1801	890	TIDAK	f
1802	891	YA	t
1803	891	TIDAK	f
1804	892	YA	t
1805	892	TIDAK	f
1806	893	YA	t
1807	893	TIDAK	f
1808	894	YA	t
1809	894	TIDAK	f
1810	895	YA	t
1811	895	TIDAK	f
1812	896	YA	t
1813	896	TIDAK	f
1814	897	YA	t
1815	897	TIDAK	f
1816	898	YA	t
1817	898	TIDAK	f
1818	899	YA	t
1819	899	TIDAK	f
1820	900	YA	t
1821	900	TIDAK	f
1822	901	YA	t
1823	901	TIDAK	f
1824	902	YA	t
1825	902	TIDAK	f
1826	903	YA	t
1827	903	TIDAK	f
1828	904	YA	t
1829	904	TIDAK	f
1830	905	YA	t
1831	905	TIDAK	f
1832	906	YA	t
1833	906	TIDAK	f
1834	907	YA	t
1835	907	TIDAK	f
1836	908	YA	t
1837	908	TIDAK	f
1838	909	YA	t
1839	909	TIDAK	f
1840	910	YA	t
1841	910	TIDAK	f
1842	911	YA	t
1843	911	TIDAK	f
1844	912	YA	t
1845	912	TIDAK	f
1846	913	YA	t
1847	913	TIDAK	f
1848	914	YA	t
1849	914	TIDAK	f
1850	915	YA	t
1851	915	TIDAK	f
1852	916	YA	t
1853	916	TIDAK	f
1854	917	YA	t
1855	917	TIDAK	f
1856	918	YA	t
1857	918	TIDAK	f
1858	919	YA	t
1859	919	TIDAK	f
1860	920	YA	t
1861	920	TIDAK	f
1862	921	YA	t
1863	921	TIDAK	f
1864	922	YA	t
1865	922	TIDAK	f
1866	923	YA	t
1867	923	TIDAK	f
1868	924	YA	t
1869	924	TIDAK	f
1870	925	YA	t
1871	925	TIDAK	f
1872	926	YA	t
1873	926	TIDAK	f
1874	927	YA	t
1875	927	TIDAK	f
1876	928	YA	t
1877	928	TIDAK	f
1878	929	YA	t
1879	929	TIDAK	f
1880	930	YA	t
1881	930	TIDAK	f
1882	931	YA	t
1883	931	TIDAK	f
1884	932	YA	t
1885	932	TIDAK	f
1886	933	YA	t
1887	933	TIDAK	f
1888	934	YA	t
1889	934	TIDAK	f
5396	1609	Ya	t
5397	1609	Tidak	f
5398	1610	Ya	t
5399	1610	Tidak	f
5400	1611	Ya	t
5401	1611	Tidak	f
5402	1612	Ya	t
5403	1612	Tidak	f
5404	1613	Ya	t
5405	1613	Tidak	f
5406	1614	Ya	t
5407	1614	Tidak	f
5408	1615	Ya	t
5409	1615	Tidak	f
5410	1616	Ya	t
5411	1616	Tidak	f
5412	1617	Ya	t
5413	1617	Tidak	f
5414	1618	Ya	t
5415	1618	Tidak	f
5416	1619	Ya	t
5417	1619	Tidak	f
5418	1620	Ya	t
5419	1620	Tidak	f
5420	1621	Ya	t
5421	1621	Tidak	f
5422	1622	Ya	t
5423	1622	Tidak	f
5424	1623	Ya	t
5425	1623	Tidak	f
5426	1624	Ya	t
5427	1624	Tidak	f
5428	1625	Ya	t
5429	1625	Tidak	f
5430	1626	Ya	t
5431	1626	Tidak	f
5432	1627	Ya	t
5433	1627	Tidak	f
5434	1628	Ya	t
5435	1628	Tidak	f
5436	1629	Ya	t
5437	1629	Tidak	f
5438	1630	Ya	t
5439	1630	Tidak	f
5440	1631	Ya	t
5441	1631	Tidak	f
5442	1632	Ya	t
5443	1632	Tidak	f
5444	1633	Ya	t
5445	1633	Tidak	f
5446	1634	Ya	t
5447	1634	Tidak	f
5448	1635	Ya	t
5449	1635	Tidak	f
5450	1636	Ya	t
5346	1599	Tidak Pernah (0)	t
5347	1599	Hampir Tidak Pernah (1)	f
5348	1599	Kadang-kadang (2)	f
5349	1599	Cukup Sering (3)	f
5350	1599	Sangat Sering (4)	f
5351	1600	Tidak Pernah (0)	t
5352	1600	Hampir Tidak Pernah (1)	f
5353	1600	Kadang-kadang (2)	f
5354	1600	Cukup Sering (3)	f
5355	1600	Sangat Sering (4)	f
5356	1601	Tidak Pernah (0)	t
5357	1601	Hampir Tidak Pernah (1)	f
5358	1601	Kadang-kadang (2)	f
5359	1601	Cukup Sering (3)	f
5360	1601	Sangat Sering (4)	f
5361	1602	Tidak Pernah (0)	t
5362	1602	Hampir Tidak Pernah (1)	f
5363	1602	Kadang-kadang (2)	f
5364	1602	Cukup Sering (3)	f
5365	1602	Sangat Sering (4)	f
5366	1603	Tidak Pernah (0)	t
5367	1603	Hampir Tidak Pernah (1)	f
5368	1603	Kadang-kadang (2)	f
5369	1603	Cukup Sering (3)	f
5370	1603	Sangat Sering (4)	f
5371	1604	Tidak Pernah (0)	t
5372	1604	Hampir Tidak Pernah (1)	f
5373	1604	Kadang-kadang (2)	f
5374	1604	Cukup Sering (3)	f
5375	1604	Sangat Sering (4)	f
5376	1605	Tidak Pernah (0)	t
5377	1605	Hampir Tidak Pernah (1)	f
5378	1605	Kadang-kadang (2)	f
5379	1605	Cukup Sering (3)	f
5380	1605	Sangat Sering (4)	f
5381	1606	Tidak Pernah (0)	t
5382	1606	Hampir Tidak Pernah (1)	f
5383	1606	Kadang-kadang (2)	f
5384	1606	Cukup Sering (3)	f
1524	752	YA	t
1525	752	TIDAK	f
1526	753	YA	t
1527	753	TIDAK	f
1528	754	YA	t
1529	754	TIDAK	f
1530	755	YA	t
1531	755	TIDAK	f
1532	756	YA	t
1533	756	TIDAK	f
1534	757	YA	t
1535	757	TIDAK	f
1536	758	YA	t
1537	758	TIDAK	f
1538	759	YA	t
1539	759	TIDAK	f
1540	760	YA	t
1541	760	TIDAK	f
1542	761	YA	t
1543	761	TIDAK	f
1544	762	YA	t
1545	762	TIDAK	f
1546	763	YA	t
1547	763	TIDAK	f
1548	764	YA	t
1549	764	TIDAK	f
1550	765	YA	t
1551	765	TIDAK	f
1552	766	YA	t
1553	766	TIDAK	f
1554	767	YA	t
1555	767	TIDAK	f
1556	768	YA	t
1557	768	TIDAK	f
1558	769	YA	t
1559	769	TIDAK	f
1560	770	YA	t
1561	770	TIDAK	f
1562	771	YA	t
1563	771	TIDAK	f
1564	772	YA	t
1565	772	TIDAK	f
1566	773	YA	t
1567	773	TIDAK	f
1568	774	YA	t
1569	774	TIDAK	f
1570	775	YA	t
1571	775	TIDAK	f
1572	776	YA	t
1573	776	TIDAK	f
1574	777	YA	t
1575	777	TIDAK	f
1576	778	YA	t
1577	778	TIDAK	f
1578	779	YA	t
1579	779	TIDAK	f
1580	780	YA	t
1581	780	TIDAK	f
1582	781	YA	t
1583	781	TIDAK	f
1584	782	YA	t
1585	782	TIDAK	f
1586	783	YA	t
1587	783	TIDAK	f
1588	784	YA	t
1589	784	TIDAK	f
5451	1636	Tidak	f
5452	1637	Ya	t
5453	1637	Tidak	f
1590	785	YA	t
1591	785	TIDAK	f
1592	786	YA	t
1593	786	TIDAK	f
1594	787	YA	t
1595	787	TIDAK	f
1596	788	YA	t
1597	788	TIDAK	f
1598	789	YA	t
1599	789	TIDAK	f
1600	790	YA	t
1601	790	TIDAK	f
1602	791	YA	t
1603	791	TIDAK	f
1604	792	YA	t
1605	792	TIDAK	f
1606	793	YA	t
1607	793	TIDAK	f
1608	794	YA	t
1609	794	TIDAK	f
1610	795	YA	t
1611	795	TIDAK	f
1612	796	YA	t
1613	796	TIDAK	f
1614	797	YA	t
1615	797	TIDAK	f
1616	798	YA	t
1617	798	TIDAK	f
1618	799	YA	t
1619	799	TIDAK	f
1620	800	YA	t
1621	800	TIDAK	f
1622	801	YA	t
1623	801	TIDAK	f
1624	802	YA	t
1625	802	TIDAK	f
1626	803	YA	t
1627	803	TIDAK	f
1628	804	YA	t
1629	804	TIDAK	f
1630	805	YA	t
1631	805	TIDAK	f
1632	806	YA	t
1633	806	TIDAK	f
1634	807	YA	t
1635	807	TIDAK	f
1636	808	YA	t
1637	808	TIDAK	f
1638	809	YA	t
1639	809	TIDAK	f
1640	810	YA	t
1641	810	TIDAK	f
1642	811	YA	t
1643	811	TIDAK	f
1644	812	YA	t
1645	812	TIDAK	f
1646	813	YA	t
1647	813	TIDAK	f
1648	814	YA	t
1649	814	TIDAK	f
1650	815	YA	t
1651	815	TIDAK	f
1652	816	YA	t
1653	816	TIDAK	f
1654	817	YA	t
1655	817	TIDAK	f
1656	818	YA	t
1657	818	TIDAK	f
1658	819	YA	t
1659	819	TIDAK	f
1660	820	YA	t
1661	820	TIDAK	f
1662	821	YA	t
1663	821	TIDAK	f
1664	822	YA	t
1665	822	TIDAK	f
1666	823	YA	t
1667	823	TIDAK	f
1668	824	YA	t
1669	824	TIDAK	f
1670	825	YA	t
1671	825	TIDAK	f
1672	826	YA	t
1673	826	TIDAK	f
1674	827	YA	t
1675	827	TIDAK	f
1676	828	YA	t
1677	828	TIDAK	f
1678	829	YA	t
1679	829	TIDAK	f
1680	830	YA	t
1681	830	TIDAK	f
1682	831	YA	t
1683	831	TIDAK	f
1684	832	YA	t
1685	832	TIDAK	f
1686	833	YA	t
1687	833	TIDAK	f
1688	834	YA	t
1689	834	TIDAK	f
1690	835	YA	t
1691	835	TIDAK	f
1692	836	YA	t
1693	836	TIDAK	f
1694	837	YA	t
1695	837	TIDAK	f
1696	838	YA	t
1697	838	TIDAK	f
1698	839	YA	t
1699	839	TIDAK	f
1700	840	YA	t
1701	840	TIDAK	f
1702	841	YA	t
1703	841	TIDAK	f
1704	842	YA	t
1705	842	TIDAK	f
1706	843	YA	t
1707	843	TIDAK	f
1708	844	YA	t
1709	844	TIDAK	f
1710	845	YA	t
1711	845	TIDAK	f
1712	846	YA	t
1713	846	TIDAK	f
1714	847	YA	t
1715	847	TIDAK	f
1716	848	YA	t
1717	848	TIDAK	f
1718	849	YA	t
1719	849	TIDAK	f
1720	850	YA	t
1721	850	TIDAK	f
1722	851	YA	t
1723	851	TIDAK	f
1724	852	YA	t
1725	852	TIDAK	f
1726	853	YA	t
1727	853	TIDAK	f
1728	854	YA	t
1729	854	TIDAK	f
1730	855	YA	t
1731	855	TIDAK	f
1732	856	YA	t
1733	856	TIDAK	f
1734	857	YA	t
1735	857	TIDAK	f
1736	858	YA	t
1737	858	TIDAK	f
1738	859	YA	t
1739	859	TIDAK	f
1740	860	YA	t
1741	860	TIDAK	f
1742	861	YA	t
1743	861	TIDAK	f
1744	862	YA	t
1745	862	TIDAK	f
1746	863	YA	t
1747	863	TIDAK	f
1748	864	YA	t
1749	864	TIDAK	f
1750	865	YA	t
1751	865	TIDAK	f
1752	866	YA	t
1753	866	TIDAK	f
1754	867	YA	t
1755	867	TIDAK	f
1756	868	YA	t
1757	868	TIDAK	f
1758	869	YA	t
1759	869	TIDAK	f
1760	870	YA	t
1761	870	TIDAK	f
1762	871	YA	t
1763	871	TIDAK	f
1764	872	YA	t
1765	872	TIDAK	f
1766	873	YA	t
1767	873	TIDAK	f
1768	874	YA	t
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.organizations (id, name, admin_id, created_at, updated_at) FROM stdin;
1	Organisasi admin	1	2026-01-06 17:38:58.421703	2026-01-06 17:38:58.421703
2	Organisasi peserta	2	2026-01-06 17:38:58.421703	2026-01-06 17:38:58.421703
3	Organisasi admin.owner	10	2026-01-06 17:38:58.421703	2026-01-06 17:38:58.421703
\.


--
-- Data for Name: questions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.questions (id, exam_id, text, marks, created_at, question_type, scale_min_label, scale_max_label, scale_min, scale_max) FROM stdin;
751	8	s	1	2026-01-10 11:10:34.761623	multiple_choice	\N	\N	1	5
752	5	Aku mempunyai nafsu makan yang baik.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
564	2	Berapa 2+2?	1	2026-01-08 04:38:53.933294	multiple_choice	\N	\N	1	5
565	1	Apa ibukota Indonesia?	1	2026-01-08 04:39:04.842255	multiple_choice	\N	\N	1	5
566	1	2 + 2 = ?	1	2026-01-08 04:39:04.842255	multiple_choice	\N	\N	1	5
196	6	Soal 1?	1	2026-01-06 21:37:09.587271	multiple_choice	\N	\N	1	5
1609	10	Apakah Anda sering mengalami sakit kepala?	1	2026-01-12 10:01:00.814637	multiple_choice	\N	\N	1	5
1610	10	Apakah Anda kehilangan nafsu makan?	1	2026-01-12 10:01:00.814637	multiple_choice	\N	\N	1	5
1611	10	Apakah Anda sulit tidur?	1	2026-01-12 10:01:00.814637	multiple_choice	\N	\N	1	5
1612	10	Apakah Anda mudah takut?	1	2026-01-12 10:01:00.814637	multiple_choice	\N	\N	1	5
1613	10	Apakah Anda merasa tegang, cemas atau khawatir?	1	2026-01-12 10:01:00.814637	multiple_choice	\N	\N	1	5
1614	10	Apakah tangan Anda gemetar?	1	2026-01-12 10:01:00.814637	multiple_choice	\N	\N	1	5
1615	10	Apakah pencernaan Anda terganggu?	1	2026-01-12 10:01:00.814637	multiple_choice	\N	\N	1	5
1616	10	Apakah Anda sulit untuk berpikir jernih?	1	2026-01-12 10:01:00.814637	multiple_choice	\N	\N	1	5
1617	10	Apakah Anda merasa tidak bahagia?	1	2026-01-12 10:01:00.814637	multiple_choice	\N	\N	1	5
1618	10	Apakah Anda menangis lebih sering dari biasanya?	1	2026-01-12 10:01:00.814637	multiple_choice	\N	\N	1	5
1619	10	Apakah Anda sulit menikmati kegiatan sehari-hari?	1	2026-01-12 10:01:00.814637	multiple_choice	\N	\N	1	5
1620	10	Apakah Anda sulit mengambil keputusan?	1	2026-01-12 10:01:00.814637	multiple_choice	\N	\N	1	5
1621	10	Apakah pekerjaan sehari-hari Anda terganggu?	1	2026-01-12 10:01:00.814637	multiple_choice	\N	\N	1	5
1622	10	Apakah Anda tidak mampu berperan dalam kehidupan?	1	2026-01-12 10:01:00.814637	multiple_choice	\N	\N	1	5
1623	10	Apakah Anda kehilangan minat terhadap banyak hal?	1	2026-01-12 10:01:00.814637	multiple_choice	\N	\N	1	5
1599	9	Selama sebulan terakhir, seberapa sering anda marah karena sesuatu yang tidak terduga	1	2026-01-12 10:01:00.664036	multiple_choice	\N	\N	1	5
753	5	Tangan dan kakiku sering terasa dingin.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
754	5	Kehidupanku penuh dengan pengalaman yang menarik.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
755	5	Aku sanggup bekerja secara baik (seperti yang sudah-sudah).	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
756	5	Tenggorokanku sering terasa tersumbat.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
757	5	Aku tidak mengalami mual dan muntah.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
758	5	Aku sangat jarang sembelit (sulit buang air besar)	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
759	5	Kadang-kadang aku ingin sekali pergi dari rumahku.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
760	5	Aku tidak pernah dikuasai oleh roh jahat.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
761	5	Aku akan membalas dendam pada orang yang berbuat salah kepadaku.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
762	5	Aku jarang terganggu oleh penyakit maag (lambung).	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
763	5	Ada kalanya aku merasa ingin mencaci maki orang lain (memarahi dengan kata-kata kotor).	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
764	5	Aku pernah mengalami kejadian aneh dan tidak masuk akal.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
765	5	Aku belum pernah melakukan perbuatan yang melanggar tata susila (penyelewengan seksual).	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
766	5	Ketika aku masih muda, aku pernah mencuri barang milik orang lain.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
767	5	Kadang-kadang aku ingin membanting barang-barang di sekitarku.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
768	5	Akhir-akhir ini, aku hampir tidak pernah merasa sakit kepala.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
769	5	Aku tidak selalu berkata yang sebenarnya.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
770	5	Semestinya aku bisa lebih berhasil (bila tidak dijahati orang lain).	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
771	5	Aku tidak pernah merasa nyeri di dada atau sakit jantung.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
878	5	Ada kalanya aku sangat bersemangat.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
1631	10	Apakah ada yang mengganggu atau hal tidak biasa dalam pikiran Anda?	1	2026-01-12 10:01:00.814637	multiple_choice	\N	\N	1	5
1632	10	Apakah Anda pernah mendengar suara tanpa tahu sumbernya atau orang lain tidak dapat mendengarnya?	1	2026-01-12 10:01:00.814637	multiple_choice	\N	\N	1	5
1633	10	Apakah mimpi Anda mengganggu pekerjaan Anda?	1	2026-01-12 10:01:00.814637	multiple_choice	\N	\N	1	5
1634	10	Apakah Anda menggunakan narkoba?	1	2026-01-12 10:01:00.814637	multiple_choice	\N	\N	1	5
1635	10	Apakah Anda mempunyai masalah dalam pernikahan?	1	2026-01-12 10:01:00.814637	multiple_choice	\N	\N	1	5
1636	10	Apakah Anda mempunyai pikiran yang sama berulang-ulang?	1	2026-01-12 10:01:00.814637	multiple_choice	\N	\N	1	5
1637	10	Apakah Anda pernah menyakiti diri sendiri?	1	2026-01-12 10:01:00.814637	multiple_choice	\N	\N	1	5
772	5	Aku adalah orang yang mudah bergaul.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
773	5	Aku sering harus menerima perintah dari orang lain yang lebih bodoh dari diriku.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
774	5	Aku selalu mandi setiap pagi.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
775	5	Kadang-kadang aku tetap bertahan pada pendirianku, sehingga orang lain menjadi tidak sabar.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
776	5	Aku hampir tidak pernah merasa sakit di tengkukku (belakang leherku).	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
777	5	Banyak orang suka membesar-besarkan kesusahan mereka hanya untuk memperoleh simpati dari orang lain.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
778	5	Aku sering mendengar orang lain membicarakan hal-hal yang aneh (gaib).	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
779	5	Aku termasuk orang penting	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
780	5	Kadang-kadang rohku terbang meninggalkan tubuhku.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
781	5	Aku selalu merasa bahwa hidup ini memang berharga.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
782	5	Perlu berusaha keras untuk meyakinkan orang lain tentang kebenaran.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
783	5	Kadang-kadang aku menunda sampai besok sesuatu yang seharusnya dapat aku kerjakan hari ini.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
784	5	Untuk mendapatkan keuntungan, sebagian besar orang akan berbohong.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
785	5	Aku jarang bertengkar dengan anggota keluargaku.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
786	5	Aku belum pernah mendapat hukuman berat karena kenakalanku di sekolah.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
787	5	Aku tidak senang pergi ke pesta dan acara lain yang sangat menggembirakan.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
788	5	Ototku tidak pernah mengalami kram atau kejang.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
789	5	Bila sedang tidak enak badan, kadang-kadang aku mudah tersinggung	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
790	5	Aku dapat melihat benda, binatang, atau orang di sekitarku, yang tidak tampak oleh orang lain.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
791	5	Kepalaku sering terasa berat atau hidungku sering mampat.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
792	5	Seseorang telah membuat rencana jahat terhadapku.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
793	5	Aku tidak melakukan tindakan yang berbahaya hanya sekedar iseng ("fun").	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
794	5	Aku sering merasa kepalaku sakit berdenyut-denyut.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
795	5	Kadang-kadang aku bisa marah.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
796	5	Kebanyakan orang berbuat jujur terutama karena takut ketahuan ketidakjujurannya.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
797	5	Di sekolah aku belum pernah dipanggil oleh guru atau kepala sekolah karena kenakalanku.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
798	5	Pembicaraan dan suaraku tidak terganggu.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
799	5	Aku memiliki kemampuan dan kepandaian yang melebihi orang lain.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
800	5	Kebanyakan orang akan menggunakan segala cara (termasuk cara yang kurang jujur) untuk mendapatkan yang mereka inginkan.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
801	5	Aku jarang mengalami sakit maag (lambung).	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
802	5	Ada kalanya pikiranku lebih cepat dari ucapanku.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
803	5	Aku tidak akan sakit hati karena teguran atau kritikan.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
804	5	Ada kalanya aku ingin berkelahi dengan seseorang.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
805	5	Aku yakin ada komplotan yang memusuhiku.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
806	5	Aku lebih ingin menang daripada kalah dalam suatu pertandingan.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
807	5	Dalam beberapa tahun terakhir ini, aku sehat-sehat selalu.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
808	5	Aku yakin ada orang yang memata-matai aku.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
809	5	Aku tidak pernah dihukum tanpa sebab.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
810	5	Aku tidak pernah merasa begitu senang seperti sekarang ini.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
811	5	Kepalaku tidak pernah terasa sakit.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
812	5	Aku ingin menjadi orang yang dihargai	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
813	5	Aku senang sekolah (Pada masa aku bersekolah di SD, SMP, atau SMA).	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
814	5	Aku sering harus berusaha keras untuk mengatasi rasa malu atas diriku.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
1624	10	Apakah Anda merasa tidak berharga?	1	2026-01-12 10:01:00.814637	multiple_choice	\N	\N	1	5
1625	10	Apakah Anda mempunyai pikiran untuk mengakhiri hidup?	1	2026-01-12 10:01:00.814637	multiple_choice	\N	\N	1	5
1626	10	Apakah Anda merasa lelah sepanjang waktu?	1	2026-01-12 10:01:00.814637	multiple_choice	\N	\N	1	5
1627	10	Apakah Anda merasa tidak enak di perut?	1	2026-01-12 10:01:00.814637	multiple_choice	\N	\N	1	5
1628	10	Apakah Anda mudah lelah?	1	2026-01-12 10:01:00.814637	multiple_choice	\N	\N	1	5
1629	10	Apakah Anda minum alkohol lebih banyak dari biasanya?	1	2026-01-12 10:01:00.814637	multiple_choice	\N	\N	1	5
1630	10	Apakah Anda yakin bahwa seseorang mencoba menyakiti Anda?	1	2026-01-12 10:01:00.814637	multiple_choice	\N	\N	1	5
1600	9	Selama sebulan terakhir, seberapa sering anda merasa tidak mampu mengontrol hal-hal yang penting dalam kehidupan anda	1	2026-01-12 10:01:00.664036	multiple_choice	\N	\N	1	5
1601	9	Selama sebulan terakhir, seberapa sering anda merasa gelisah dan tertekan	1	2026-01-12 10:01:00.664036	multiple_choice	\N	\N	1	5
1602	9	Selama sebulan terakhir, seberapa sering anda merasa yakin terhadap kemampuan diri untuk mengatasi masalah pribadi	1	2026-01-12 10:01:00.664036	multiple_choice	\N	\N	1	5
1603	9	Selama sebulan terakhir, seberapa sering anda merasa segala sesuatu yang terjadi sesuai dengan harapan anda	1	2026-01-12 10:01:00.664036	multiple_choice	\N	\N	1	5
1604	9	Selama sebulan terakhir, seberapa sering anda merasa tidak mampu menyelesaikan hal-hal yang harus dikerjakan	1	2026-01-12 10:01:00.664036	multiple_choice	\N	\N	1	5
1605	9	Selama sebulan terakhir, seberapa sering anda mampu mengontrol rasa mudah tersinggung dalam kehidupan anda	1	2026-01-12 10:01:00.664036	multiple_choice	\N	\N	1	5
1606	9	Selama sebulan terakhir, seberapa sering anda merasa lebih mampu mengatasi masalah jika dibandingkan dengan orang lain	1	2026-01-12 10:01:00.664036	multiple_choice	\N	\N	1	5
1607	9	Selama sebulan terakhir, seberapa sering anda marah karena adanya masalah yang tidak dapat anda kendalikan	1	2026-01-12 10:01:00.664036	multiple_choice	\N	\N	1	5
1608	9	Selama sebulan terakhir, seberapa sering anda merasa menumpuknya kesulitan yang begitu tinggi sehingga tidak dapat diatasi	1	2026-01-12 10:01:00.664036	multiple_choice	\N	\N	1	5
815	5	Ada orang yang telah mencoba untuk meracuni aku.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
816	5	Kepalaku hampir tidak pernah pusing.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
817	5	Ada kalanya aku tidak menyadari bahwa aku telah melakukan sesuatu.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
818	5	Bila sedang bosan, aku suka mencari aktivitas yang menyenangkan.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
819	5	Aku sering memperhatikan bahwa tanganku gemetar bila melakukan sesuatu.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
820	5	Aku sangat jarang sakit kepala.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
821	5	Kedua tanganku tidak pernah menjadi kikuk atau janggal.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
822	5	Aku tidak mengalami kesulitan untuk menjaga keseimbangan tubuh sewaktu berjalan.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
823	5	Aku pernah tidak mampu mengendalikan ucapan dan gerakan anggota tubuhku.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
824	5	Tidak setiap orang yang kukenal, aku menyukainya.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
825	5	Aku dapat menikmati berbagai jenis hiburan.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
826	5	Aku tidak senang bergaul dengan banyak orang (terutama lawan jenis).	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
827	5	Aku sering mendengar suara orang yang tidak aku ketahui dari mana asalnya.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
828	5	Orang tuaku hampir tidak pernah menyalahkan pergaulanku.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
829	5	Ada kalanya aku mempergunjingkan orang lain (gossip).	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
830	5	Ada kalanya aku merasa sangat mudah untuk mengambil keputusan.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
831	5	Aku hampir tidak pernah mengalami jantung berdebar-debar maupun sesak napas.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
832	5	Aku tidak senang berbincang mengenai masalah seksual.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
833	5	Bila berbeda pendapat dengan orang lain, aku akan berpegang teguh pada pendirianku.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
834	5	Aku mudah menjadi marah tetapi juga cepat mereda kembali.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
835	5	Ada orang yang selalu berusaha merampas barang-barangku.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
836	5	Tubuhku sangat jarang terasa nyeri.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
837	5	Kadang-kadang tanpa sebab aku merasa sangat gembira.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
838	5	Ada orang yang mencoba mencuri ide dan pemikiranku.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
839	5	Pikiranku pernah kosong sesaat, sehingga kegiatanku terhenti.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
840	5	Aku sangat percaya diri.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
841	5	Ada kalanya aku sulit menahan keinginanku untuk mencuri barang di toko.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
842	5	Lebih aman untuk tidak mempercayai siapapun juga.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
843	5	Aku sering merasa tidak bersemangat.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
844	5	Suasana yang bersemangat/menyenangkan hampir selalu dapat menghilangkan kesedihanku.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
845	5	Kulitku mati rasa di beberapa tempat.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
846	5	Ada kalanya aku begitu kagum pada kehebatan seorang penjahat, sehingga aku cenderung mengharapkan dia dapat meloloskan diri dari kejaran polisi.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
847	5	Aku sering merasa ada orang yang tak kukenal mengamati diriku.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
848	5	Kebanyakan orang mencari teman, karena teman itu diharapkan akan berguna bagi mereka.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
849	5	Aku jarang memperhatikan suara yang sering mendengung di kedua telingaku.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
850	5	Aku yakin bahwa aku dibicarakan (digosipkan) oleh orang lain.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
851	5	Sesekali aku tertawa juga bila mendengar lelucon yang porno.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
852	5	Aku tidak minum minuman keras (alkohol) berlebihan.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
853	5	Aku belum pernah melakukan tindakan kriminal.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
854	5	Pada waktu-waktu tertentu aku merasa sangat gembira tanpa sebab yang jelas.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
855	5	Aku sangat sensitif terhadap beberapa permasalahan, sehingga aku tidak sanggup untuk mengungkapkan.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
856	5	Aku sulit mendapat teman baru.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
857	5	Untuk menghindari kesulitan, hampir semua orang akan berbohong.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
858	5	Kebanyakan orang suka menolong orang lain.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
859	5	Aku bukan seorang pemalu.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
860	5	Aku tidak pernah mengalami lumpuh atau kelemahan otot yang berat.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
861	5	Kadang-kadang suaraku hilang atau berubah, walaupun aku tidak sedang sakit batuk pilek.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
862	5	Aku hampir tidak pernah mencium bau yang aneh.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
863	5	Aku jarang merasa cemas.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
864	5	Aku mudah menjadi tidak sabar terhadap perilaku orang lain.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
865	5	Kadang-kadang aku begitu bersemangat, sehingga sukar tidur.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
866	5	Ada kalanya aku terganggu oleh pendengaranku yang terlalu tajam.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
867	5	Seringkali aku menghindar agar tidak bertemu dengan seseorang.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
868	5	Aku sering merasa seakan-akan barang-barang di sekitarku itu tidak nyata (semu).	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
869	5	Aku tidak mempunyai musuh yang sungguh-sungguh bermaksud mencelakai aku.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
870	5	Aku memiliki pemikiran yang aneh dan tidak masuk akal.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
871	5	Aku biasanya mengharapkan usahaku akan berhasil.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
872	5	Aku mendengar suara aneh-aneh ketika aku sendirian.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
873	5	Aku takut pada benda atau orang yang sebetulnya tidak berbahaya.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
874	5	Aku dapat dengan mudah membuat orang lain takut padaku dan kadang-kadang aku melakukannya untuk iseng.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
875	5	Seringkali kata-kata kotor atau kata-kata seram muncul dalam pikiranku dan aku tidak dapat menghilangkannya.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
876	5	Kadang-kadang beberapa pikiran yang tidak penting memenuhi benakku dan mengganggu aku selama beberapa hari.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
877	5	Hampir setiap hari ada kejadian yang menakutkan aku.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
879	5	Orang-orang mengatakan perkataan yang menghina dan kasar tentang diriku.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
880	5	Seseorang telah mengendalikan pikiranku.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
881	5	Bila diberi kesempatan, aku dapat melakukan hal-hal yang bermanfaat bagi masyarakat dunia.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
882	5	Aku sering berjumpa dengan para ahli yang ternyata tidak lebih pandai dari diriku.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
883	5	Pada umumnya orang menuntut haknya dihargai secara berlebihan dibandingkan dengan niat mereka untuk menghargai hak orang lain.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
884	5	Aku telah beberapa kali melakukan sesuatu karena dihipnotik orang lain.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
885	5	Seseorang telah mencoba mempengaruhi pikiranku.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
886	5	Aku ingat aku pernah "pura-pura sakit" untuk menghindari sesuatu.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
887	5	Ada waktu tertentu aku merasa sangat bersemangat, sehingga aku tidak perlu tidur sampai berhari-hari.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
888	5	Aku hampir tidak pernah dipukul pada masa kecilku.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
889	5	Aku sering dikatakan sebagai orang yang sabar.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
890	5	Aku cenderung cemas bila perkataanku melukai perasaan orang lain.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
891	5	Aku suka membuat orang menerka-nerka tentang sesuatu yang akan kulakukan selanjutnya.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
892	5	Aku merasa sangat senang bila dapat mengalahkan para penjahat.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
893	5	Pada waktu masih sekolah, aku hampir tidak pernah membolos.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
894	5	Ada kalanya aku harus bersikap kasar terhadap orang yang tidak sopan atau menjengkelkan.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
895	5	Aku cenderung batal melakukan sesuatu bila orang lain menganggap aku tidak mampu melakukannya.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
896	5	Aku sering cenderung beralih dari pendapatku untuk memperoleh kesepakatan dari seseorang yang menentangku.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
897	5	Aku tidak selalu membuang sampah di tong sampah.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
898	5	Aku merasa terganggu oleh orang-orang yang mengamati diriku.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
899	5	Aku tidak pernah melihat suatu penampakan (penglihatan gaib).	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
900	5	Aku tidak pernah minum obat-obatan terlarang atau obat tidur, kecuali obat yang diresepkan dokter.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
901	5	Aku sering menyesali sifatku yang mudah tersinggung dan marah.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
902	5	Nilai kelakuanku di sekolah biasanya bagus.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
903	5	Bila seorang pria berada berduaan dengan seorang wanita, biasanya pria itu akan berfikir mengenai hal-hal yang berkaitan dengan seksual wanita itu.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
904	5	Aku harus mengakui bahwa aku kadang-kadang terlalu merisaukan sesuatu yang sebenarnya tidak perlu dirisaukan.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
905	5	Atasanku sering mengatur agar dia mendapat pujian atas kesuksesan kerja kami, dan menyalahkan kami bila kami gagal.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
906	5	Aku sering merasa bersalah, karena aku sering pura-pura menyesal atas perbuatanku melebihi dari yang seharusnya.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
907	5	Sanak keluargaku cukup rukun dan damai.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
908	5	Beberapa kali dalam seminggu aku merasa seolah-olah akan terjadi peristiwa yang menakutkan.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
909	5	Kadang-kadang aku yakin bahwa orang lain dapat mengetahui sesuatu yang sedang aku pikirkan.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
910	5	Aku sering terbangun tengah malam dan merasa ketakutan.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
911	5	Orang-orang ramah terhadap diriku.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
912	5	Aku tidak senang mengisap ganja.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
913	5	Sampai saat ini aku masih sebagai peminum minuman keras atau pemakai obat-obatan terlarang.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
914	5	Kadang-kadang aku merasa tidak nyaman.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
915	5	Hantu atau roh dapat mempengaruhi manusia untuk berbuat baik atau berbuat buruk.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
916	5	Tujuan utama (goal) dalam hidupku masih dalam jangkauan kemampuanku.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
917	5	Aku sering mudah marah ketika orang lain mengganggu kelancaran pekerjaanku.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
918	5	Aku sering merasa bisa membaca pikiran orang lain.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
919	5	Aku mabok setiap minggu sekali atau lebih.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
920	5	Kadang-kadang aku menjadi begitu marah dan kecewa, sedangkan aku tidak tahu penyebabnya.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
921	5	Aku jengkel terhadap sifatku yang terlalu banyak peduli pada orang lain.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
922	5	Aku suka membuat keputusan dan memberi tugas kepada orang lain.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
923	5	Bila aku dalam keadaan tertekan, aku pasti mengalami sakit kepala.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
924	5	Umumnya, kebanyakan pria setia pada istrinya.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
925	5	Bila aku minum minuman beralkohol, aku menjadi marah-marah dan memecahkan piring gelas atau perabotan rumah tangga.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
926	5	Bila aku sangat marah kepada seseorang, rasanya seolah-olah dadaku akan meledak.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
927	5	Aku pernah sangat marah, sehingga aku melukai seseorang dalam suatu perkelahian.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
928	5	Aku kadang-kadang mendengar pikiran-pikiranku berbicara keras	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
929	5	Ketika sedih, aku mengunjungi kawan-kawan dan selalu dapat menghilangkannya.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
930	5	Pada kebanyakan pasangan perkawinan, satu atau kedua duanya tidak bahagia	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
931	5	Kebanyakan pasangan perkawinan menunjukkan rasa kasih sayang satu sama lainnya.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
932	5	Aku tidak pernah melihat mobil sejak lima tahun yang lalu.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
933	5	Tahun 2009, Aku dicalonkan oleh banyak Partai Politik, untuk menjadi Presiden R.I., tetapi Aku tidak Bersedia.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
934	5	Dalam tahun 2009, Aku pernah selama satu minggu tidak makan sama sekali.	1	2026-01-10 11:26:58.379621	multiple_choice	\N	\N	1	5
\.


--
-- Data for Name: site_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.site_settings (id, setting_key, setting_value, created_at, updated_at) FROM stdin;
1	company_name	Asisya Consulting	2026-01-11 13:06:58.166489	2026-01-11 13:06:58.166489
2	company_tagline	Platform asesmen psikologi profesional	2026-01-11 13:06:58.166489	2026-01-11 13:06:58.166489
3	logo_url	/asisya.png	2026-01-11 13:06:58.166489	2026-01-11 13:06:58.166489
4	primary_color	#0891b2	2026-01-11 13:06:58.166489	2026-01-11 13:06:58.166489
5	last_branding_update	2026-01-11 13:06:59.405348+00	2026-01-11 13:06:59.405348	2026-01-11 13:06:59.405348
6	last_branding_updater		2026-01-11 13:06:59.405348	2026-01-11 13:06:59.405348
7	admin_branding_access	false	2026-01-11 13:06:59.405348	2026-01-11 13:06:59.405348
\.


--
-- Data for Name: user_profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_profiles (id, user_id, nomor_peserta, tanggal_lahir, usia, jenis_kelamin, pendidikan_terakhir, pekerjaan, lokasi_test, alamat_ktp, nik, created_at, updated_at, full_name, foto, marital_status) FROM stdin;
1	7	1234	2018-01-01	7	Laki-laki	SMP	Pelajar	Surabaya	adnjladnladsla	1236972391628913	2025-12-30 23:29:37.65744	2025-12-30 23:29:37.65744	\N	\N	\N
2	8	123123	2007-01-01	18	Laki-laki	SMA/K	Operator	Jakarta	aihcbacbosdc	6812313271286231	2025-12-31 01:29:15.315465	2025-12-31 01:29:15.315465	\N	\N	\N
3	17	\N	2000-05-09	25	Laki-laki	SMA/K	SMO	Surabaya	Rungkut	1234567890123456	2026-01-07 01:48:45.326071	2026-01-07 01:48:45.326071	Testering	\N	\N
4	19	\N	2012-01-19	13	Laki-laki	SMA/K	SMO	Surabaya	dadadda	1234567890123456	2026-01-08 04:13:22.2745	2026-01-08 04:13:22.2745	rhrhrhhr	\N	Belum Kawin
5	20	\N	2009-01-09	16	Laki-laki	SMP	SMO	Surabaya	Jabode	1234567890123456	2026-01-08 04:16:40.26969	2026-01-08 04:16:40.26969	meutia ananda	\N	Belum Kawin
6	21	\N	2005-02-08	20	Perempuan	SMP	SMO	Surabaya	Rungkut	1234567890123456	2026-01-08 18:05:42.93152	2026-01-08 18:05:42.93152	Testing2	\N	Belum Kawin
7	22	\N	2019-02-07	6	Laki-laki	SMP	SMO	Surabaya	daad	0192091202111201	2026-01-08 19:38:18.039138	2026-01-08 19:38:18.039138	Langkah Maju	\N	Belum Kawin
8	25	\N	2020-01-09	\N	Laki-laki	SMA/K	SMO	Surabaya	Rungkut	1234567890123456	2026-01-09 01:01:45.646375	2026-01-09 01:01:45.646375	Testing22	\N	Belum Kawin
9	26	\N	2026-01-07	\N	Laki-laki	S1	SMO	Surabaya	Rungkut	1234567890123456	2026-01-09 01:44:59.54431	2026-01-09 01:44:59.54431	Testering	\N	Sudah Kawin
10	27	\N	2014-02-09	\N	Laki-laki	SMP	SMO	Surabaya	Rungkut	1234567890123456	2026-01-09 02:26:23.290768	2026-01-09 02:26:23.290768	FINALSASI	\N	Sudah Kawin
11	28	\N	2026-01-09	\N	Laki-laki	SMP	SMO	Surabaya	dada	1234567890123456	2026-01-09 02:45:35.386436	2026-01-09 02:45:35.386436	Santoso	\N	Belum Kawin
12	29	\N	2026-01-02	\N	Perempuan	SMP	MARK	SBY	SUUSUS	2929292922992929	2026-01-09 03:23:16.190842	2026-01-09 03:23:16.190842	Suwarni Yulianti	\N	Sudah Kawin
13	30	\N	2026-01-09	\N	Perempuan	SMP	MARK	SBY	djajadija	2929292922992929	2026-01-09 04:02:02.12893	2026-01-09 04:02:02.12893	Terakhir	\N	Belum Kawin
14	31	\N	1995-01-01	\N	Laki-laki	SMP	SMO	Surabaya	PLN	1234567890123456	2026-01-09 11:33:50.997888	2026-01-09 11:33:50.997888	Dodo Arief	\N	Belum Kawin
15	32	\N	2026-01-09	\N	Laki-laki	SMP	SMO	Surabaya	Rungkut	1234567890123456	2026-01-09 13:18:20.442801	2026-01-09 13:18:20.442801	finalisasi	\N	Belum Kawin
16	33	\N	2002-01-10	\N	Laki-laki	SMP	SMO	Surabaya	Rungkut	1234567890123456	2026-01-09 14:23:26.646441	2026-01-09 14:23:26.646441	Yanto Lengkap	\N	Belum Kawin
17	34	\N	1988-02-10	\N	Laki-laki	S1	marketing	surabaya	surabaya	0000000000000000	2026-01-10 10:56:50.484641	2026-01-10 10:56:50.484641	ahmad hidayat	\N	Sudah Kawin
18	51	\N	2026-01-12	\N	Laki-laki	SMA/K	SMO	Surabaya	Rungkut	1234567890123456	2026-01-12 05:30:55.102064	2026-01-12 05:30:55.102064	fffinalisasi	\N	Belum Kawin
19	67	\N	1995-01-15	\N	Laki-laki	S1	Software Engineer	Jakarta	Jl. Test No. 123	1234567890123456	2026-01-12 08:03:24.399385	2026-01-12 08:03:24.399385	Test Simulasi User	\N	Belum Menikah
20	74	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-12 08:53:11.441728	2026-01-12 08:53:11.441728	Test Candidate Flow	\N	\N
21	86	\N	1995-05-15	\N	Laki-laki	S1	Software Engineer	Online	Jakarta Selatan, DKI Jakarta	3175012345670001	2026-01-12 09:50:20.826565	2026-01-12 09:50:20.826565	Test Simulation User	\N	Belum Menikah
22	87	\N	1995-05-15	\N	Laki-laki	S1	Software Engineer	Online	Jakarta Selatan, DKI Jakarta	3175012345670001	2026-01-12 09:51:21.656391	2026-01-12 09:51:21.656391	Test Simulation User	\N	Belum Menikah
23	88	\N	1995-05-15	\N	Laki-laki	S1	Software Engineer	Online	Jakarta Selatan, DKI Jakarta	3175012345670001	2026-01-12 09:56:08.729297	2026-01-12 09:56:08.729297	Test Simulation User	\N	Belum Menikah
24	91	\N	1995-05-15	\N	Laki-laki	S1	Software Engineer	Online	Jakarta Selatan, DKI Jakarta	3175012345670001	2026-01-12 10:04:19.00554	2026-01-12 10:04:19.00554	Test Simulation User	\N	Belum Menikah
25	92	\N	1995-05-15	\N	Laki-laki	S1	Software Engineer	Online	Jakarta Selatan, DKI Jakarta	3175012345670001	2026-01-12 10:06:19.185359	2026-01-12 10:06:19.185359	Test Simulation User	\N	Belum Menikah
26	99	\N	2026-01-12	\N	Laki-laki	S2	SMO	Surabaya	RUngkut	1234567890123456	2026-01-12 11:21:31.678118	2026-01-12 11:21:31.678118	cocaocaocao	\N	Sudah Kawin
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, password_hash, role, full_name, created_at, profile_completed, email, is_active, registration_type, organization_id) FROM stdin;
3	testpeserta	$2b$10$VegayCYUfF12j4JHsO.eGu1s7vz28260zVlIVNstSMIZRvsjytvf2	candidate	Test Peserta	2025-12-28 13:51:28.982395	f	\N	t	manual	\N
5	peserta175	$2b$10$X28WW7HyZo2Be8CpEW3A1ubBGaQadFZyyJApPPOLuVvXoF2TRIqge	candidate	peserta2	2025-12-30 23:05:52.588469	f	peserta@gmail.com	t	manual	\N
6	asisya261	$2b$10$zOVFnYn9fo2FGd7hqJEhsO1Pkv4HOur5jFkqRSJp2iTmdfRUFg2qG	candidate	Abyansyah	2025-12-30 23:06:45.081582	f	asisya@gmail.com	t	manual	\N
7	Bager	$2b$10$Q1onBIe0PVygL7jIvrI86epCb9f5MPavDlfk.M9KIghC8czSPmFzC	candidate	Bager	2025-12-30 23:13:15.011206	t	admin@demo.com	t	manual	\N
25	candidate_x6mttdrpabqw	CANDIDATE_NO_PASSWORD	candidate	\N	2026-01-09 01:01:17.45456	t	candidate_x6mttdrpabqw@candidate.local	t	candidate_code	\N
8	check	$2b$10$IXX2n1IwkT3j4R6AgnPITOvx9fKMnw.vlq33J5aC0D7re/qxuV.uC	candidate	check	2025-12-31 01:28:33.694096	t	check@gmail.com	t	manual	\N
26	candidate_httkfwzmfc23	CANDIDATE_NO_PASSWORD	candidate	\N	2026-01-09 01:44:17.525801	t	candidate_httkfwzmfc23@candidate.local	t	candidate_code	\N
12	psikolog.sample	$2b$10$35c99Qsa665KteWBoforruGbFQAd.BW44sLRUwZeXhP4WHskGxxbq	psychologist	\N	2026-01-06 13:35:52.461824	t	psikolog@asisya.com	t	manual	1
14	candidate_nngtdfkuzlu2	CANDIDATE_NO_PASSWORD	candidate	\N	2026-01-06 19:24:35.463183	f	candidate_nngtdfkuzlu2@candidate.local	t	candidate_code	\N
15	candidate_t3hpwbrn3aav	CANDIDATE_NO_PASSWORD	candidate	\N	2026-01-06 22:32:18.622238	f	candidate_t3hpwbrn3aav@candidate.local	t	candidate_code	\N
17	candidate_ldp3gb58298t	CANDIDATE_NO_PASSWORD	candidate	Testering	2026-01-07 01:36:23.893132	t	candidate_ldp3gb58298t@candidate.local	t	candidate_code	\N
18	candidate_z7sbku7hwwtg	CANDIDATE_NO_PASSWORD	candidate	\N	2026-01-07 02:09:05.887846	f	candidate_z7sbku7hwwtg@candidate.local	t	candidate_code	\N
19	candidate_md3t6h2q7aln	CANDIDATE_NO_PASSWORD	candidate	rhrhrhhr	2026-01-08 04:12:49.710747	t	candidate_md3t6h2q7aln@candidate.local	t	candidate_code	\N
20	candidate_4ndtvgpm73ry	CANDIDATE_NO_PASSWORD	candidate	meutia ananda	2026-01-08 04:16:01.1479	t	candidate_4ndtvgpm73ry@candidate.local	t	candidate_code	\N
21	candidate_4s3nhazquxf4	CANDIDATE_NO_PASSWORD	candidate	Testing2	2026-01-08 18:05:03.364365	t	candidate_4s3nhazquxf4@candidate.local	t	candidate_code	\N
16	tpsi	$2b$10$AMKeQT8a/XwIs/tmVFGMR.IYLpkImA/89YiLKaCb6cTS5f4V923yq	psychologist	TPSI	2026-01-07 01:15:53.141413	t	tpsi@gmail.com	t	manual	1
22	candidate_wvfthf787zcg	CANDIDATE_NO_PASSWORD	candidate	Langkah Maju	2026-01-08 19:37:44.081177	t	candidate_wvfthf787zcg@candidate.local	t	candidate_code	\N
23	candidate_zydgqnygrd84	CANDIDATE_NO_PASSWORD	candidate	\N	2026-01-08 20:37:17.370759	f	candidate_zydgqnygrd84@candidate.local	t	candidate_code	\N
24	candidate_9jpd9j9uwlwf	CANDIDATE_NO_PASSWORD	candidate	\N	2026-01-08 23:42:08.048503	f	candidate_9jpd9j9uwlwf@candidate.local	t	candidate_code	\N
27	candidate_kszfjy4x5ppe1uei	CANDIDATE_NO_PASSWORD	candidate	Jagat	2026-01-09 02:25:49.763323	t	candidate_kszfjy4x5ppe1uei@candidate.local	t	candidate_code	\N
28	candidate_dq8yytcb1qw9uhgd	CANDIDATE_NO_PASSWORD	candidate	Santoso	2026-01-09 02:45:16.568936	t	candidate_dq8yytcb1qw9uhgd@candidate.local	t	candidate_code	\N
29	candidate_j6r9fc6bhe387s0l	CANDIDATE_NO_PASSWORD	candidate	Yulianti	2026-01-09 03:22:36.315936	t	candidate_j6r9fc6bhe387s0l@candidate.local	t	candidate_code	\N
30	candidate_8lwn5eq64qh7kgug	CANDIDATE_NO_PASSWORD	candidate	\N	2026-01-09 04:01:43.230781	t	candidate_8lwn5eq64qh7kgug@candidate.local	t	candidate_code	\N
31	candidate_wahawyctghbjharh	CANDIDATE_NO_PASSWORD	candidate	\N	2026-01-09 11:33:26.79267	t	candidate_wahawyctghbjharh@candidate.local	t	candidate_code	\N
32	candidate_z4eluddv8pzpsq9q	CANDIDATE_NO_PASSWORD	candidate	\N	2026-01-09 13:18:00.262308	t	candidate_z4eluddv8pzpsq9q@candidate.local	t	candidate_code	\N
33	candidate_pbzcy55dau7lvfu2	CANDIDATE_NO_PASSWORD	candidate	\N	2026-01-09 14:22:55.309062	t	candidate_pbzcy55dau7lvfu2@candidate.local	t	candidate_code	\N
34	candidate_tcxx6am6j9uqxpjo	CANDIDATE_NO_PASSWORD	candidate	Ahmad Hidayat	2026-01-10 10:54:35.659476	t	candidate_tcxx6am6j9uqxpjo@candidate.local	t	candidate_code	\N
85	candidate_012600000004	CANDIDATE_NO_PASSWORD	candidate	\N	2026-01-12 09:49:37.255489	f	candidate_012600000004@candidate.local	t	candidate_code	\N
2	peserta	$2b$10$abPm7f2bRxcGwers07POseL2HSZOSyH8sOlzyCSfDC.ijt7LvhN4m	psychologist	Peserta Ujian	2025-12-24 19:44:11.304161	f	\N	t	manual	2
86	candidate_012600000005	CANDIDATE_NO_PASSWORD	candidate	\N	2026-01-12 09:50:20.411966	t	candidate_012600000005@candidate.local	t	candidate_code	\N
87	candidate_012600000006	CANDIDATE_NO_PASSWORD	candidate	\N	2026-01-12 09:51:21.554131	t	candidate_012600000006@candidate.local	t	candidate_code	\N
62	candidate_012620010001	CANDIDATE_NO_PASSWORD	candidate	\N	2026-01-12 06:53:32.291736	f	candidate_012620010001@candidate.local	t	candidate_code	\N
88	candidate_012600000007	CANDIDATE_NO_PASSWORD	candidate	\N	2026-01-12 09:56:08.628814	t	candidate_012600000007@candidate.local	t	candidate_code	\N
91	candidate_012600000008	CANDIDATE_NO_PASSWORD	candidate	\N	2026-01-12 10:04:18.655802	t	candidate_012600000008@candidate.local	t	candidate_code	\N
92	candidate_012600000009	CANDIDATE_NO_PASSWORD	candidate	\N	2026-01-12 10:06:19.104391	t	candidate_012600000009@candidate.local	t	candidate_code	\N
67	candidate_012600000001	CANDIDATE_NO_PASSWORD	candidate	\N	2026-01-12 08:02:45.041461	t	candidate_012600000001@candidate.local	t	candidate_code	\N
74	test2flow	$2b$10$9aunv5Yqj2ZnThb0ilSFYuTapka76kjEV18L8W6/g8vZ6PCQcAF4O	candidate	Test Candidate Flow	2026-01-12 08:50:21.186822	t	test2flow@test.com	t	manual	\N
99	candidate_012600000003	CANDIDATE_NO_PASSWORD	candidate	\N	2026-01-12 11:21:11.768042	t	candidate_012600000003@candidate.local	t	candidate_code	\N
51	candidate_012620010002	CANDIDATE_NO_PASSWORD	candidate	percobaan	2026-01-12 05:29:27.483788	t	candidate_012620010002@candidate.local	t	candidate_code	\N
10	admin.owner	$2b$10$XeDxMS1Ycg0LsgO7tqgDEezwGgQ9Ir16qyJ3HniD6NfjoQh9HbM5W	admin	\N	2026-01-06 13:32:35.730938	t	adminowner@asisya.com	t	manual	3
1	admin	$2b$10$UMN/kw40kPEKRY/Bku6IzepEAvJgFc6Os.8EydqJeh9FR0wyoTElu	admin	Administrator	2025-12-24 19:44:11.304161	t	\N	t	manual	1
9	dev.asisya.adm	$2b$10$8yo8DuJvcZ1gRqfcB6y2beoJ1GToJSknS/i0wGPQsOuiVmGAYCSTK	super_admin	Super Admin	2026-01-06 13:32:35.718706	t	dev@asisya.com	t	manual	\N
13	Psikolog	$2b$10$z3aS7Hea1088tRBDs7CBrOeOB.6SigdAfKRITK4R5/DGpNG9tBU8q	psychologist	psikologin	2026-01-06 17:56:36.226748	f	psi@log.com	t	manual	1
\.


--
-- Name: _migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public._migrations_id_seq', 1, false);


--
-- Name: admin_quotas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.admin_quotas_id_seq', 39, true);


--
-- Name: answers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.answers_id_seq', 956, true);


--
-- Name: branding_access_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.branding_access_id_seq', 34, true);


--
-- Name: branding_presets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.branding_presets_id_seq', 35, true);


--
-- Name: candidate_codes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.candidate_codes_id_seq', 2436, true);


--
-- Name: candidate_groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.candidate_groups_id_seq', 123, true);


--
-- Name: company_codes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.company_codes_id_seq', 2, true);


--
-- Name: exam_answers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.exam_answers_id_seq', 2131, true);


--
-- Name: exam_assessors_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.exam_assessors_id_seq', 7, true);


--
-- Name: exam_attempts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.exam_attempts_id_seq', 55, true);


--
-- Name: exams_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.exams_id_seq', 28, true);


--
-- Name: mmpi_results_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mmpi_results_id_seq', 7, true);


--
-- Name: options_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.options_id_seq', 5453, true);


--
-- Name: organizations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.organizations_id_seq', 3, true);


--
-- Name: questions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.questions_id_seq', 1637, true);


--
-- Name: site_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.site_settings_id_seq', 251, true);


--
-- Name: user_profiles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_profiles_id_seq', 26, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 111, true);


--
-- Name: _migrations _migrations_filename_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._migrations
    ADD CONSTRAINT _migrations_filename_key UNIQUE (filename);


--
-- Name: _migrations _migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._migrations
    ADD CONSTRAINT _migrations_pkey PRIMARY KEY (id);


--
-- Name: admin_quotas admin_quotas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_quotas
    ADD CONSTRAINT admin_quotas_pkey PRIMARY KEY (id);


--
-- Name: answers answers_attempt_id_question_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_attempt_id_question_id_key UNIQUE (attempt_id, question_id);


--
-- Name: answers answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_pkey PRIMARY KEY (id);


--
-- Name: branding_access branding_access_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branding_access
    ADD CONSTRAINT branding_access_pkey PRIMARY KEY (id);


--
-- Name: branding_presets branding_presets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branding_presets
    ADD CONSTRAINT branding_presets_pkey PRIMARY KEY (id);


--
-- Name: candidate_codes candidate_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_codes
    ADD CONSTRAINT candidate_codes_code_key UNIQUE (code);


--
-- Name: candidate_codes candidate_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_codes
    ADD CONSTRAINT candidate_codes_pkey PRIMARY KEY (id);


--
-- Name: candidate_groups candidate_groups_exam_id_candidate_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_groups
    ADD CONSTRAINT candidate_groups_exam_id_candidate_id_key UNIQUE (exam_id, candidate_id);


--
-- Name: candidate_groups candidate_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_groups
    ADD CONSTRAINT candidate_groups_pkey PRIMARY KEY (id);


--
-- Name: code_sequences code_sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.code_sequences
    ADD CONSTRAINT code_sequences_pkey PRIMARY KEY (prefix);


--
-- Name: company_codes company_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_codes
    ADD CONSTRAINT company_codes_code_key UNIQUE (code);


--
-- Name: company_codes company_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_codes
    ADD CONSTRAINT company_codes_pkey PRIMARY KEY (id);


--
-- Name: exam_answers exam_answers_attempt_id_question_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_answers
    ADD CONSTRAINT exam_answers_attempt_id_question_id_key UNIQUE (attempt_id, question_id);


--
-- Name: exam_answers exam_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_answers
    ADD CONSTRAINT exam_answers_pkey PRIMARY KEY (id);


--
-- Name: exam_assessors exam_assessors_exam_id_admin_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_assessors
    ADD CONSTRAINT exam_assessors_exam_id_admin_id_key UNIQUE (exam_id, admin_id);


--
-- Name: exam_assessors exam_assessors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_assessors
    ADD CONSTRAINT exam_assessors_pkey PRIMARY KEY (id);


--
-- Name: exam_attempts exam_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_attempts
    ADD CONSTRAINT exam_attempts_pkey PRIMARY KEY (id);


--
-- Name: exams exams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_pkey PRIMARY KEY (id);


--
-- Name: mmpi_results mmpi_results_attempt_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mmpi_results
    ADD CONSTRAINT mmpi_results_attempt_id_key UNIQUE (attempt_id);


--
-- Name: mmpi_results mmpi_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mmpi_results
    ADD CONSTRAINT mmpi_results_pkey PRIMARY KEY (id);


--
-- Name: options options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.options
    ADD CONSTRAINT options_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (id);


--
-- Name: site_settings site_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_pkey PRIMARY KEY (id);


--
-- Name: site_settings site_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: admin_quotas unique_admin_quota; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_quotas
    ADD CONSTRAINT unique_admin_quota UNIQUE (admin_id);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_answers_attempt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_answers_attempt ON public.answers USING btree (attempt_id);


--
-- Name: idx_answers_attempt_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_answers_attempt_id ON public.answers USING btree (attempt_id);


--
-- Name: idx_answers_option_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_answers_option_id ON public.answers USING btree (selected_option_id);


--
-- Name: idx_answers_question_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_answers_question_id ON public.answers USING btree (question_id);


--
-- Name: idx_candidate_codes_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidate_codes_active ON public.candidate_codes USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_candidate_codes_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidate_codes_admin_id ON public.candidate_codes USING btree (admin_id);


--
-- Name: idx_candidate_codes_candidate_exam; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidate_codes_candidate_exam ON public.candidate_codes USING btree (candidate_id, exam_id) WHERE (is_active = true);


--
-- Name: idx_candidate_codes_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidate_codes_code ON public.candidate_codes USING btree (code) WHERE (is_active = true);


--
-- Name: idx_candidate_codes_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidate_codes_company ON public.candidate_codes USING btree (company_code_id) WHERE (company_code_id IS NOT NULL);


--
-- Name: idx_candidate_codes_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidate_codes_created ON public.candidate_codes USING btree (created_at DESC);


--
-- Name: idx_candidate_codes_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidate_codes_created_by ON public.candidate_codes USING btree (created_by);


--
-- Name: idx_candidate_codes_pattern; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidate_codes_pattern ON public.candidate_codes USING btree (code varchar_pattern_ops);


--
-- Name: idx_candidate_groups_assessor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidate_groups_assessor_id ON public.candidate_groups USING btree (assessor_id);


--
-- Name: idx_candidate_groups_exam_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidate_groups_exam_id ON public.candidate_groups USING btree (exam_id);


--
-- Name: idx_code_sequences_prefix; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_code_sequences_prefix ON public.code_sequences USING btree (prefix);


--
-- Name: idx_company_codes_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_codes_active ON public.company_codes USING btree (is_active);


--
-- Name: idx_company_codes_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_codes_code ON public.company_codes USING btree (code);


--
-- Name: idx_company_codes_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_codes_org ON public.company_codes USING btree (organization_id);


--
-- Name: idx_exam_answers_attempt_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_answers_attempt_id ON public.exam_answers USING btree (attempt_id);


--
-- Name: idx_exam_answers_question_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_answers_question_id ON public.exam_answers USING btree (question_id);


--
-- Name: idx_exam_assessors_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_assessors_admin_id ON public.exam_assessors USING btree (admin_id);


--
-- Name: idx_exam_assessors_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_assessors_deleted ON public.exam_assessors USING btree (exam_id, admin_id, deleted_at);


--
-- Name: idx_exam_assessors_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_assessors_deleted_at ON public.exam_assessors USING btree (deleted_at);


--
-- Name: idx_exam_assessors_exam_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_assessors_exam_admin ON public.exam_assessors USING btree (exam_id, admin_id);


--
-- Name: idx_exam_assessors_exam_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_assessors_exam_id ON public.exam_assessors USING btree (exam_id);


--
-- Name: idx_exam_attempts_completed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_attempts_completed ON public.exam_attempts USING btree (user_id, exam_id, status) WHERE ((status)::text = 'completed'::text);


--
-- Name: idx_exam_attempts_composite; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_attempts_composite ON public.exam_attempts USING btree (user_id, exam_id, status);


--
-- Name: idx_exam_attempts_exam_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_attempts_exam_user ON public.exam_attempts USING btree (exam_id, user_id);


--
-- Name: idx_exam_attempts_in_progress; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_attempts_in_progress ON public.exam_attempts USING btree (status) WHERE ((status)::text = 'in_progress'::text);


--
-- Name: idx_exam_attempts_pss_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_attempts_pss_category ON public.exam_attempts USING btree (pss_category) WHERE (pss_category IS NOT NULL);


--
-- Name: idx_exam_attempts_srq_conclusion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_attempts_srq_conclusion ON public.exam_attempts USING btree (srq_conclusion) WHERE (srq_conclusion IS NOT NULL);


--
-- Name: idx_exam_attempts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_attempts_status ON public.exam_attempts USING btree (status);


--
-- Name: idx_exam_attempts_user_exam; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_attempts_user_exam ON public.exam_attempts USING btree (user_id, exam_id);


--
-- Name: idx_exam_attempts_user_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_attempts_user_status ON public.exam_attempts USING btree (user_id, status);


--
-- Name: idx_exams_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exams_published ON public.exams USING btree (status, created_at) WHERE ((status)::text = 'published'::text);


--
-- Name: idx_exams_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exams_status ON public.exams USING btree (status);


--
-- Name: idx_migrations_filename; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_migrations_filename ON public._migrations USING btree (filename);


--
-- Name: idx_mmpi_results_attempt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mmpi_results_attempt ON public.mmpi_results USING btree (attempt_id);


--
-- Name: idx_options_is_correct; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_options_is_correct ON public.options USING btree (question_id, is_correct);


--
-- Name: idx_options_question_correct; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_options_question_correct ON public.options USING btree (question_id, is_correct);


--
-- Name: idx_options_question_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_options_question_id ON public.options USING btree (question_id);


--
-- Name: idx_questions_exam; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questions_exam ON public.questions USING btree (exam_id);


--
-- Name: idx_questions_exam_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questions_exam_id ON public.questions USING btree (exam_id);


--
-- Name: idx_site_settings_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_site_settings_key ON public.site_settings USING btree (setting_key);


--
-- Name: idx_user_profiles_nomor_peserta; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_nomor_peserta ON public.user_profiles USING btree (nomor_peserta);


--
-- Name: idx_user_profiles_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_user ON public.user_profiles USING btree (user_id);


--
-- Name: idx_user_profiles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_user_id ON public.user_profiles USING btree (user_id);


--
-- Name: idx_users_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_active ON public.users USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_organization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_organization ON public.users USING btree (organization_id);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: site_settings trigger_update_site_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_site_settings_updated_at BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.update_site_settings_updated_at();


--
-- Name: admin_quotas admin_quotas_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_quotas
    ADD CONSTRAINT admin_quotas_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: answers answers_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.exam_attempts(id) ON DELETE CASCADE;


--
-- Name: answers answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: answers answers_selected_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_selected_option_id_fkey FOREIGN KEY (selected_option_id) REFERENCES public.options(id) ON DELETE CASCADE;


--
-- Name: branding_access branding_access_last_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branding_access
    ADD CONSTRAINT branding_access_last_updated_by_fkey FOREIGN KEY (last_updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: branding_presets branding_presets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branding_presets
    ADD CONSTRAINT branding_presets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: candidate_codes candidate_codes_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_codes
    ADD CONSTRAINT candidate_codes_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: candidate_codes candidate_codes_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_codes
    ADD CONSTRAINT candidate_codes_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: candidate_codes candidate_codes_company_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_codes
    ADD CONSTRAINT candidate_codes_company_code_id_fkey FOREIGN KEY (company_code_id) REFERENCES public.company_codes(id) ON DELETE SET NULL;


--
-- Name: candidate_codes candidate_codes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_codes
    ADD CONSTRAINT candidate_codes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: candidate_codes candidate_codes_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_codes
    ADD CONSTRAINT candidate_codes_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE SET NULL;


--
-- Name: candidate_groups candidate_groups_assessor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_groups
    ADD CONSTRAINT candidate_groups_assessor_id_fkey FOREIGN KEY (assessor_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: candidate_groups candidate_groups_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_groups
    ADD CONSTRAINT candidate_groups_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- Name: candidate_groups candidate_groups_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_groups
    ADD CONSTRAINT candidate_groups_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: candidate_groups candidate_groups_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_groups
    ADD CONSTRAINT candidate_groups_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;


--
-- Name: company_codes company_codes_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_codes
    ADD CONSTRAINT company_codes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: exam_assessors exam_assessors_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_assessors
    ADD CONSTRAINT exam_assessors_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: exam_assessors exam_assessors_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_assessors
    ADD CONSTRAINT exam_assessors_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- Name: exam_assessors exam_assessors_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_assessors
    ADD CONSTRAINT exam_assessors_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;


--
-- Name: exam_attempts exam_attempts_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_attempts
    ADD CONSTRAINT exam_attempts_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;


--
-- Name: exam_attempts exam_attempts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_attempts
    ADD CONSTRAINT exam_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: mmpi_results mmpi_results_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mmpi_results
    ADD CONSTRAINT mmpi_results_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.exam_attempts(id) ON DELETE CASCADE;


--
-- Name: options options_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.options
    ADD CONSTRAINT options_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: organizations organizations_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id);


--
-- Name: questions questions_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;


--
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

