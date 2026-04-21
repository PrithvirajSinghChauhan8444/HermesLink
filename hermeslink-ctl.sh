#!/bin/bash

# HermesLink Control Script
# Manages systemd user services for HermesLink Agent and API Server.

SERVICES=("hermeslink-agent.service" "hermeslink-api.service")

show_usage() {
    echo "Usage: ./hermeslink-ctl.sh [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start       Start all HermesLink services"
    echo "  stop        Stop all HermesLink services"
    echo "  restart     Restart all HermesLink services"
    echo "  status      Check the status of services"
    echo "  logs        Show live logs (tail)"
    echo "  show-logs   Show recent logs and exit"
    echo "  enable      Enable services to start on boot"
    echo "  disable     Disable services from starting on boot"
    echo ""
}

case "$1" in
    start)
        echo "Starting HermesLink services..."
        systemctl --user start "${SERVICES[@]}"
        ;;
    stop)
        echo "Stopping HermesLink services..."
        systemctl --user stop "${SERVICES[@]}"
        ;;
    restart)
        echo "Restarting HermesLink services..."
        systemctl --user restart "${SERVICES[@]}"
        ;;
    status)
        echo "Checking HermesLink services status..."
        systemctl --user status "${SERVICES[@]}"
        ;;
    logs)
        echo "Showing live logs (Ctrl+C to stop)..."
        journalctl --user -f -u hermeslink-agent -u hermeslink-api
        ;;
    show-logs)
        echo "Showing recent logs..."
        journalctl --user -n 50 -u hermeslink-agent -u hermeslink-api
        ;;
    enable)
        echo "Enabling services for auto-start..."
        systemctl --user enable "${SERVICES[@]}"
        echo "Enabling linger for $USER..."
        loginctl enable-linger "$USER"
        ;;
    disable)
        echo "Disabling services..."
        systemctl --user disable "${SERVICES[@]}"
        ;;
    *)
        show_usage
        exit 1
        ;;
esac
