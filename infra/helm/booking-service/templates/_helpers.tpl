{{- define "booking-service.namespace" -}}
{{- default .Release.Namespace .Values.namespace -}}
{{- end -}}

{{- define "booking-service.image" -}}
{{- if .tag -}}
{{ printf "%s:%s" .repository .tag }}
{{- else -}}
{{ .repository }}
{{- end -}}
{{- end -}}
