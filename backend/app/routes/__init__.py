# -*- coding: utf-8 -*-
"""
Avukat Yönetim Sistemi - Route Exports
Tüm route blueprint'lerini dışa aktarır.
"""

from app.routes.auth import auth_bp
from app.routes.clients import clients_bp
from app.routes.cases import cases_bp
from app.routes.finance import finance_bp
from app.routes.leads import leads_bp
from app.routes.documents import documents_bp
from app.routes.calendar_routes import calendar_bp
from app.routes.templates import templates_bp
from app.routes.dashboard import dashboard_bp
from app.routes.users import users_bp

__all__ = [
    'auth_bp',
    'clients_bp',
    'cases_bp',
    'finance_bp',
    'leads_bp',
    'documents_bp',
    'calendar_bp',
    'templates_bp',
    'dashboard_bp',
    'users_bp'
]
