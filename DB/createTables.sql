--
-- PostgreSQL database dump
--

-- Dumped from database version 12.3
-- Dumped by pg_dump version 12.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.logs (
    "time" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    userid character varying(255) NOT NULL,
    context character varying(255),
    eventtype character varying(255),
    eventtitle character varying(255),
    eventvalue character varying(255),
    eventdata character varying(500),
    sourceip character varying(255),
    wlid integer
);
ALTER TABLE public.logs OWNER TO postgres;
CREATE INDEX logs_time_idx ON public.logs USING btree ("time" DESC);


CREATE TABLE public.sessions (
    id SERIAL PRIMARY KEY,
    start_time timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    end_time timestamp,
    is_active boolean,
    wlid integer,
    userid character varying(255) NOT NULL,
    context character varying(255),
    total_time integer,
    active_time integer,
    idle_time integer,
    user_agent character varying(500),
    sourceip character varying(255),
    lastupdate timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL

);
ALTER TABLE public.sessions OWNER TO postgres;
CREATE INDEX sessions_time_idx ON public.sessions USING btree (start_time DESC);


--
-- PostgreSQL database dump complete
--