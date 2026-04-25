{{- define "scheduler-service.namespace" -}}
{{- default .Release.Namespace .Values.namespace -}}
{{- end -}}

{{- define "scheduler-service.image" -}}
{{- if .tag -}}
{{ printf "%s:%s" .repository .tag }}
{{- else -}}
{{ .repository }}
{{- end -}}
{{- end -}}
