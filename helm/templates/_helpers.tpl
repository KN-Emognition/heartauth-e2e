{{- define "heartauth-core-e2e.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "heartauth-core-e2e.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- include "heartauth-core-e2e.name" . -}}
{{- end -}}
{{- end -}}

{{- define "heartauth-core-e2e.labels" -}}
app.kubernetes.io/name: {{ include "heartauth-core-e2e.name" . }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version | replace "+" "_" }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- if .Values.commonLabels }}
{{- toYaml .Values.commonLabels | nindent 0 }}
{{- end }}
{{- end -}}
